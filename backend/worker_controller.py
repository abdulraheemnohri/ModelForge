import subprocess
import os
import signal
import sys
from typing import Dict, Optional

class WorkerController:
    def __init__(self):
        self.workers: Dict[str, subprocess.Popen] = {}

    def start_worker(self, model_name: str, engine: str, model_path: str, port: int, config: dict) -> bool:
        if model_name in self.workers:
            return False

        worker_script = f"backend/workers/{engine.replace('.', '_')}_worker.py"
        if not os.path.exists(worker_script):
            return False

        # Build command-line arguments from config
        cmd = [sys.executable, worker_script, "--model_path", model_path, "--port", str(port)]
        for k, v in config.items():
            cmd.extend([f"--{k}", str(v)])

        try:
            # Start worker as a subprocess
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                preexec_fn=os.setsid
            )
            self.workers[model_name] = process
            return True
        except Exception as e:
            print(f"Error starting worker {model_name}: {e}")
            return False

    def stop_worker(self, model_name: str) -> bool:
        process = self.workers.get(model_name)
        if not process:
            return False

        try:
            # Kill process group
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

worker_controller = WorkerController()
