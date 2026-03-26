import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.main import app
from backend.database import Base, get_db, User, APIKey, Model

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Create a test user and API key
    user = User(username="testuser", hashed_password="hashedpassword", role="Admin")
    db.add(user)
    db.commit()
    db.refresh(user)

    api_key = APIKey(key="test_key", owner_id=user.id)
    db.add(api_key)
    db.commit()

    yield
    Base.metadata.drop_all(bind=engine)

def test_health():
    # Note: in main.py it is app.get("/api/health")
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_list_models():
    response = client.get("/api/models", headers={"Authorization": "Bearer test_key"})
    assert response.status_code == 200

def test_add_and_delete_model():
    # Add
    response = client.post("/api/models",
                           headers={"Authorization": "Bearer test_key"},
                           json={"name": "new_model", "engine": "llama_cpp", "path": "/path", "config": {}})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "new_model"

    # Delete
    response = client.delete("/api/models/new_model", headers={"Authorization": "Bearer test_key"})
    assert response.status_code == 200
    assert response.json()["message"] == "Model new_model deleted"

def test_get_stats():
    response = client.get("/api/stats", headers={"Authorization": "Bearer test_key"})
    assert response.status_code == 200
    assert "cpu" in response.json()
    assert "memory" in response.json()
    assert "gpu" in response.json()
