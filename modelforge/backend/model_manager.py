from sqlalchemy.orm import Session
from backend.database import Model, generate_api_key
from backend.worker_controller import worker_controller
from typing import List, Optional

class ModelManager:
    def __init__(self, db: Session):
        self.db = db

    def list_models(self) -> List[Model]:
        return self.db.query(Model).all()

    def get_model(self, model_name: str) -> Optional[Model]:
        return self.db.query(Model).filter(Model.name == model_name).first()

    def add_model(self, name: str, engine: str, path: str, config: dict):
        model = Model(
            name=name,
            engine=engine,
            path=path,
            config=config,
            status="stopped",
            api_key=generate_api_key()
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def start_model(self, model_name: str, port: int) -> bool:
        model = self.get_model(model_name)
        if not model:
            return False

        if worker_controller.start_worker(model.name, model.engine, model.path, port, model.config):
            model.status = "running"
            model.port = port
            self.db.commit()
            return True
        else:
            model.status = "error"
            self.db.commit()
            return False

    def stop_model(self, model_name: str) -> bool:
        model = self.get_model(model_name)
        if not model:
            return False

        if worker_controller.stop_worker(model_name):
            model.status = "stopped"
            model.port = None
            self.db.commit()
            return True
        return False

    def delete_model(self, model_name: str) -> bool:
        model = self.get_model(model_name)
        if not model:
            return False

        if model.status == "running":
            self.stop_model(model_name)

        self.db.delete(model)
        self.db.commit()
        return True

    def update_model_status(self, model_name: str):
        model = self.get_model(model_name)
        if not model:
            return

        status = worker_controller.get_worker_status(model_name)
        if status is not None and model.status == "running":
            model.status = "stopped"
            model.port = None
            self.db.commit()
