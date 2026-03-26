import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.main import app
from backend.database import Base, get_db, User, APIKey, Model
from unittest.mock import patch, MagicMock

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

    # Create an admin user and key
    admin = User(username="admin", hashed_password="hashedpassword", role="Admin")
    db.add(admin)
    db.commit()
    db.refresh(admin)

    admin_key = APIKey(key="sk_admin", owner_id=admin.id)
    db.add(admin_key)
    db.commit()

    # Create a model with its own key
    model = Model(name="test_model", engine="llama_cpp", path="/path", config={}, status="running", port=9000, api_key="sk_model")
    db.add(model)
    db.commit()

    yield
    Base.metadata.drop_all(bind=engine)

@patch("httpx.AsyncClient.post")
@patch("httpx.AsyncClient.stream")
def test_chat_access_admin_key(mock_stream, mock_post):
    mock_post.return_value = MagicMock(status_code=200, json=lambda: {"response": "ok"})
    # Admin key should have access to any model
    response = client.post("/api/chat",
                           headers={"Authorization": "Bearer sk_admin"},
                           json={"model": "test_model", "messages": [{"role": "user", "content": "hi"}]})
    assert response.status_code == 200

@patch("httpx.AsyncClient.post")
@patch("httpx.AsyncClient.stream")
def test_chat_access_model_key(mock_stream, mock_post):
    mock_post.return_value = MagicMock(status_code=200, json=lambda: {"response": "ok"})
    # Model key should have access to its own model
    response = client.post("/api/chat",
                           headers={"Authorization": "Bearer sk_model"},
                           json={"model": "test_model", "messages": [{"role": "user", "content": "hi"}]})
    assert response.status_code == 200

def test_chat_access_invalid_key():
    # Wrong key should fail
    response = client.post("/api/chat",
                           headers={"Authorization": "Bearer sk_wrong"},
                           json={"model": "test_model", "messages": [{"role": "user", "content": "hi"}]})
    assert response.status_code == 403

def test_model_regeneration_key():
    response = client.post("/api/models/test_model/regenerate-key",
                           headers={"Authorization": "Bearer sk_admin"})
    assert response.status_code == 200
    new_key = response.json()["api_key"]
    assert new_key != "sk_model"
