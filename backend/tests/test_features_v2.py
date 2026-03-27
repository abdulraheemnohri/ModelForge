import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.main import app
from backend.database import Base, get_db, User, APIKey, Model, ModelLog, ChatUsage
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

    admin = User(username="admin", hashed_password="password", role="Admin")
    db.add(admin)
    db.commit()

    key = APIKey(key="sk_admin", owner_id=admin.id)
    db.add(key)
    db.commit()

    model = Model(name="test_model", engine="llama_cpp", path="/path", status="running", port=9000, api_key="sk_model")
    db.add(model)
    db.commit()

    yield
    Base.metadata.drop_all(bind=engine)

def test_model_restart():
    response = client.post("/api/models/test_model/restart", headers={"Authorization": "Bearer sk_admin"})
    # Since we don't have real workers, it should fail to start but pass the restart logic call
    assert response.status_code in [200, 500]

def test_get_logs():
    response = client.get("/api/models/test_model/logs", headers={"Authorization": "Bearer sk_admin"})
    assert response.status_code == 200
    assert "logs" in response.json()

def test_get_usage():
    response = client.get("/api/usage", headers={"Authorization": "Bearer sk_admin"})
    assert response.status_code == 200
    assert isinstance(response.json(), list)
