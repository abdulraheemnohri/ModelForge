from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from backend.database import get_db, Model, User, APIKey, generate_api_key
from backend.auth import get_current_user, check_admin_role, verify_model_access
from backend.model_manager import ModelManager
from backend.resource_monitor import resource_monitor
import httpx
import json
import os
import shutil
import asyncio

router = APIRouter()

@router.get("/models")
async def list_models(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    manager = ModelManager(db)
    return manager.list_models()

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

@router.post("/models/{model_name}/regenerate-key")
async def regenerate_key(model_name: str, db: Session = Depends(get_db), current_user: User = Depends(check_admin_role)):
    manager = ModelManager(db)
    model = manager.get_model(model_name)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    model.api_key = generate_api_key()
    db.commit()
    return {"api_key": model.api_key}

@router.post("/models/upload")
async def upload_model(file: UploadFile = File(...), current_user: User = Depends(check_admin_role)):
    os.makedirs("models", exist_ok=True)
    file_path = os.path.join("models", file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"path": file_path}

@router.post("/models/download")
async def download_model(request: Request, current_user: User = Depends(check_admin_role)):
    data = await request.json()
    url = data["url"]
    filename = url.split("/")[-1]
    os.makedirs("models", exist_ok=True)
    file_path = os.path.join("models", filename)

    # Offload blocking I/O to a thread
    def download_file(url, path):
        with httpx.stream("GET", url) as response:
            with open(path, "wb") as f:
                for chunk in response.iter_bytes():
                    f.write(chunk)

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, download_file, url, file_path)
    return {"path": file_path}

@router.post("/models/{model_name}/start")
async def start_model(model_name: str, port: int, db: Session = Depends(get_db), current_user: User = Depends(check_admin_role)):
    manager = ModelManager(db)
    if manager.start_model(model_name, port):
        return {"message": f"Model {model_name} started on port {port}"}
    else:
        raise HTTPException(status_code=500, detail=f"Failed to start model {model_name}")

@router.post("/models/{model_name}/stop")
async def stop_model(model_name: str, db: Session = Depends(get_db), current_user: User = Depends(check_admin_role)):
    manager = ModelManager(db)
    if manager.stop_model(model_name):
        return {"message": f"Model {model_name} stopped"}
    else:
        raise HTTPException(status_code=500, detail=f"Failed to stop model {model_name}")

@router.post("/chat")
async def chat(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    model_name = data.get("model")

    # Custom verification of access
    manager = ModelManager(db)
    model = manager.get_model(model_name)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        key = auth_header.replace("Bearer ", "")
    else:
        key = auth_header

    # Check if key matches model's key OR is an admin key
    is_admin_key = db.query(APIKey).filter(APIKey.key == key).join(User).filter(User.role == "Admin").first()
    if key != model.api_key and not is_admin_key:
         raise HTTPException(status_code=403, detail="Invalid API key for this model")

    if model.status != "running":
        raise HTTPException(status_code=400, detail=f"Model {model_name} is not running")

    url = f"http://localhost:{model.port}/v1/chat/completions"

    async with httpx.AsyncClient() as client:
        if data.get("stream"):
            async def stream_proxy():
                async with client.stream("POST", url, json=data, timeout=None) as response:
                    async for line in response.aiter_lines():
                        yield f"{line}\n\n"
            return StreamingResponse(stream_proxy(), media_type="text/event-stream")
        else:
            response = await client.post(url, json=data, timeout=None)
            return response.json()

@router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user)):
    return resource_monitor.get_system_stats()
