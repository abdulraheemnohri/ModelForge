from fastapi import Security, HTTPException, Depends
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.orm import Session
from backend.database import get_db, APIKey, User, Model

API_KEY_NAME = "Authorization"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

def get_current_user(api_key_header: str = Security(api_key_header), db: Session = Depends(get_db)):
    if not api_key_header:
        raise HTTPException(status_code=403, detail="API key is missing")

    if api_key_header.startswith("Bearer "):
        key = api_key_header.replace("Bearer ", "")
    else:
        key = api_key_header

    # Check master API keys
    api_key = db.query(APIKey).filter(APIKey.key == key).first()
    if api_key:
        api_key.usage_count += 1
        db.commit()
        return api_key.owner

    # Check model-specific API keys
    model = db.query(Model).filter(Model.api_key == key).first()
    if model:
        # Return a mock user or system user for model-specific keys
        # For simplicity, we'll return None and handle it in routes or return a Guest user
        guest_user = db.query(User).filter(User.role == "Guest").first()
        if not guest_user:
            guest_user = User(username="model_key_user", role="Guest")
        return guest_user

    raise HTTPException(status_code=403, detail="Invalid API key")

def check_admin_role(current_user: User = Depends(get_current_user)):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

def verify_model_access(model_name: str, api_key_header: str = Security(api_key_header), db: Session = Depends(get_db)):
    if not api_key_header:
        raise HTTPException(status_code=403, detail="API key is missing")

    if api_key_header.startswith("Bearer "):
        key = api_key_header.replace("Bearer ", "")
    else:
        key = api_key_header

    # Master key access
    api_key = db.query(APIKey).filter(APIKey.key == key).first()
    if api_key and api_key.owner.role in ["Admin", "Developer"]:
        return True

    # Model-specific key access
    model = db.query(Model).filter(Model.name == model_name, Model.api_key == key).first()
    if model:
        return True

    raise HTTPException(status_code=403, detail="Access denied for this model")
