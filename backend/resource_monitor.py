import psutil
import time

try:
    import pynvml
    HAS_GPU = True
except ImportError:
    HAS_GPU = False

class ResourceMonitor:
    def __init__(self):
        if HAS_GPU:
            try:
                pynvml.nvmlInit()
            except:
                pass

    def get_system_stats(self):
        stats = {
            "cpu": {
                "percent": psutil.cpu_percent(interval=None),
                "cores": psutil.cpu_count(logical=True)
            },
            "memory": {
                "total": psutil.virtual_memory().total,
                "available": psutil.virtual_memory().available,
                "percent": psutil.virtual_memory().percent
            },
            "disk": {
                "total": psutil.disk_usage('/').total,
                "free": psutil.disk_usage('/').free,
                "percent": psutil.disk_usage('/').percent
            }
        }

        gpu_stats = []
        if HAS_GPU:
            try:
                device_count = pynvml.nvmlDeviceGetCount()
                for i in range(device_count):
                    handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                    info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                    gpu_stats.append({
                        "name": pynvml.nvmlDeviceGetName(handle),
                        "total_vram": info.total,
                        "used_vram": info.used,
                        "percent_vram": (info.used / info.total) * 100,
                        "percent_util": util.gpu
                    })
            except:
                pass

        stats["gpu"] = gpu_stats if gpu_stats else "Not detected or unsupported"

        return stats

resource_monitor = ResourceMonitor()
