from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from backend.database import get_db, Model, User, APIKey, generate_api_key, ModelLog, ChatUsage
from backend.auth import get_current_user, check_admin_role
from backend.model_manager import ModelManager
from backend.resource_monitor import resource_monitor
from backend.worker_controller import worker_controller
import httpx
import json
import os
import shutil
import asyncio
from pathlib import Path
import datetime

router = APIRouter()

def sanitize_filename(filename: str) -> str:
    return Path(filename).name

@router.get("/health")
async def health():
    return {"status": "ok"}

@router.get("/models")
async def list_models(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    manager = ModelManager(db)
    models = manager.list_models()
    safe_models = []
    for m in models:
        m_dict = {
            "id": m.id,
            "name": m.name,
            "engine": m.engine,
            "path": m.path,
            "config": m.config,
            "status": m.status,
            "port": m.port
        }
        if current_user.role == "Admin":
            m_dict["api_key"] = m.api_key
        safe_models.append(m_dict)
    return safe_models

@router.post("/models")
async def add_model(request: Request, db: Session = Depends(get_db), current_user: User = Depends(check_admin_role)):
    data = await request.json()
    manager = ModelManager(db)
    model = Model(
        name=data["name"],
        engine=data["engine"],
        path=data["path"],
        config=data.get("config", {}),
        status="stopped",
        api_key=generate_api_key()
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model

@router.delete("/models/{model_name}")
async def delete_model(model_name: str, db: Session = Depends(get_db), current_user: User = Depends(check_admin_role)):
    manager = ModelManager(db)
    if manager.delete_model(model_name):
        return {"message": f"Model {model_name} deleted"}
    else:
        raise HTTPException(status_code=500, detail=f"Failed to delete model {model_name}")

@router.post("/models/{model_name}/start")
async def start_model(model_name: str, port: int = None, db: Session = Depends(get_db), current_user: User = Depends(check_admin_role)):
    manager = ModelManager(db)
    model = manager.get_model(model_name)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    target_port = port or model.port or 9000
    if manager.start_model(model_name, target_port):
        return {"message": f"Model {model_name} started on port {target_port}"}
    else:
        raise HTTPException(status_code=500, detail=f"Failed to start model {model_name}")

@router.post("/models/{model_name}/stop")
async def stop_model(model_name: str, db: Session = Depends(get_db), current_user: User = Depends(check_admin_role)):
    manager = ModelManager(db)
    if manager.stop_model(model_name):
        return {"message": f"Model {model_name} stopped"}
    else:
        raise HTTPException(status_code=500, detail=f"Failed to stop model {model_name}")

@router.post("/models/{model_name}/restart")
async def restart_model(model_name: str, db: Session = Depends(get_db), current_user: User = Depends(check_admin_role)):
    manager = ModelManager(db)
    model = manager.get_model(model_name)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    port = model.port
    manager.stop_model(model_name)
    await asyncio.sleep(1)
    if manager.start_model(model_name, port or 9000):
        return {"message": f"Model {model_name} restarted"}
    else:
        raise HTTPException(status_code=500, detail=f"Failed to restart model {model_name}")

@router.get("/models/{model_name}/logs")
async def get_model_logs(model_name: str, current_user: User = Depends(get_current_user)):
    return {"logs": worker_controller.get_logs(model_name)}

@router.post("/chat")
async def chat(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    model_name = data.get("model")

    manager = ModelManager(db)
    model = manager.get_model(model_name)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    auth_header = request.headers.get("Authorization", "")
    key = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else auth_header

    admin_key = db.query(APIKey).filter(APIKey.key == key).join(User).filter(User.role == "Admin").first()
    if key != model.api_key and not admin_key:
         raise HTTPException(status_code=403, detail="Invalid API key for this model")

    if model.status != "running":
        raise HTTPException(status_code=400, detail=f"Model {model_name} is not running")

    url = f"http://localhost:{model.port}/v1/chat/completions"

    async with httpx.AsyncClient() as client:
        if data.get("stream"):
            async def stream_proxy():
                total_completion_tokens = 0
                async with client.stream("POST", url, json=data, timeout=None) as response:
                    async for line in response.aiter_lines():
                        if line.startswith("data: "):
                            total_completion_tokens += 1 # Mock increment
                        yield f"{line}\n\n"
                # Save usage
                usage = ChatUsage(model_name=model_name, api_key=key, completion_tokens=total_completion_tokens, total_tokens=total_completion_tokens)
                db.add(usage)
                db.commit()
            return StreamingResponse(stream_proxy(), media_type="text/event-stream")
        else:
            response = await client.post(url, json=data, timeout=None)
            res_json = response.json()
            # Save usage
            usage = ChatUsage(
                model_name=model_name,
                api_key=key,
                prompt_tokens=res_json.get("usage", {}).get("prompt_tokens", 0),
                completion_tokens=res_json.get("usage", {}).get("completion_tokens", 0),
                total_tokens=res_json.get("usage", {}).get("total_tokens", 0)
            )
            db.add(usage)
            db.commit()
            return res_json

@router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user)):
    return resource_monitor.get_system_stats()

@router.get("/usage")
async def get_usage(db: Session = Depends(get_db), current_user: User = Depends(check_admin_role)):
    return db.query(ChatUsage).order_by(ChatUsage.timestamp.desc()).limit(100).all()
