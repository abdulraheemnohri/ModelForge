import subprocess
import os
import signal
import sys
import threading
from typing import Dict, Optional, List
from backend.database import SessionLocal, ModelLog

class WorkerController:
    def __init__(self):
        self.workers: Dict[str, subprocess.Popen] = {}
        self.logs: Dict[str, List[str]] = {}

    def start_worker(self, model_name: str, engine: str, model_path: str, port: int, config: dict) -> bool:
        if model_name in self.workers:
            return False

        worker_script = f"backend/workers/{engine.replace('.', '_')}_worker.py"
        if not os.path.exists(worker_script):
            return False

        cmd = [sys.executable, worker_script, "--model_path", model_path, "--port", str(port)]
        for k, v in config.items():
            cmd.extend([f"--{k}", str(v)])

        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                preexec_fn=os.setsid
            )
            self.workers[model_name] = process
            self.logs[model_name] = []

            # Start a thread to read logs
            thread = threading.Thread(target=self._capture_logs, args=(model_name, process), daemon=True)
            thread.start()

            return True
        except Exception as e:
            self._add_log(model_name, "ERROR", f"Failed to start: {str(e)}")
            return False

    def _capture_logs(self, model_name: str, process: subprocess.Popen):
        for line in iter(process.stdout.readline, ""):
            self._add_log(model_name, "INFO", line.strip())
        process.stdout.close()

    def _add_log(self, model_name: str, level: str, message: str):
        if not message: return

        # Keep in memory for fast access (last 100 lines)
        if model_name not in self.logs: self.logs[model_name] = []
        self.logs[model_name].append(f"[{level}] {message}")
        self.logs[model_name] = self.logs[model_name][-100:]

        # Persist to DB periodically or immediately
        db = SessionLocal()
        try:
            log_entry = ModelLog(model_name=model_name, level=level, message=message)
            db.add(log_entry)
            db.commit()
        except:
            pass
        finally:
            db.close()

    def stop_worker(self, model_name: str) -> bool:
        process = self.workers.get(model_name)
        if not process:
            return False

        try:
            os.killpg(os.getpgid(process.pid), signal.SIGTERM)
            process.wait(timeout=5)
            del self.workers[model_name]
            return True
        except subprocess.TimeoutExpired:
            os.killpg(os.getpgid(process.pid), signal.SIGKILL)
            del self.workers[model_name]
            return True
        except Exception as e:
            print(f"Error stopping worker {model_name}: {e}")
            return False

    def get_worker_status(self, model_name: str) -> Optional[int]:
        process = self.workers.get(model_name)
        if process:
            return process.poll()
        return None

    def get_logs(self, model_name: str) -> List[str]:
        return self.logs.get(model_name, [])

    def get_worker_pid(self, model_name: str) -> Optional[int]:
        process = self.workers.get(model_name)
        if process:
            return process.pid
        return None

worker_controller = WorkerController()
