from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy import create_engine
import datetime
import json
import os
import secrets

SQLALCHEMY_DATABASE_URL = "sqlite:///./modelforge.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="Guest") # Admin, Developer, Guest

    api_keys = relationship("APIKey", back_populates="owner")

class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    description = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="api_keys")

class Model(Base):
    __tablename__ = "models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    engine = Column(String) # llama_cpp, vllm, transformers
    path = Column(String)
    config = Column(JSON) # temperature, top_p, etc.
    status = Column(String, default="stopped") # running, stopped, error
    port = Column(Integer, nullable=True)
    api_key = Column(String, unique=True, index=True)

def generate_api_key():
    return "sk_" + secrets.token_hex(16)

def init_db():
    Base.metadata.create_all(bind=engine)
    seed_db()

def seed_db():
    db = SessionLocal()
    if db.query(User).count() == 0:
        admin = User(username="admin", hashed_password="adminpassword", role="Admin")
        db.add(admin)
        db.commit()
        db.refresh(admin)
        key = APIKey(key="sk_admin", owner_id=admin.id, description="Default admin key")
        db.add(key)
        db.commit()

    if os.path.exists("config/models.json"):
        with open("config/models.json", "r") as f:
            models_data = json.load(f)
            for m_data in models_data:
                if not db.query(Model).filter(Model.name == m_data["name"]).first():
                    model = Model(
                        name=m_data["name"],
                        engine=m_data["engine"],
                        path=m_data["path"],
                        config=m_data["config"],
                        status="stopped",
                        api_key=generate_api_key()
                    )
                    db.add(model)
            db.commit()
    db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
