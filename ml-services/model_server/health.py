"""
Enhanced Health Check Endpoints for ML Services
Provides comprehensive health status for backend integration
"""

from fastapi import APIRouter, Response, status
from pydantic import BaseModel
from typing import Dict, List, Optional
import redis
import mlflow
import logging
from datetime import datetime
import psutil
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["Health"])


class ServiceStatus(BaseModel):
    """Individual service health status"""
    name: str
    status: str  # 'healthy', 'degraded', 'unhealthy'
    message: str
    latency_ms: Optional[float] = None
    details: Optional[Dict] = None


class HealthResponse(BaseModel):
    """Complete health check response"""
    status: str  # 'healthy', 'degraded', 'unhealthy'
    timestamp: str
    version: str
    services: List[ServiceStatus]
    system: Dict[str, any]


class ReadinessResponse(BaseModel):
    """Readiness probe response"""
    ready: bool
    reason: Optional[str] = None


class LivenessResponse(BaseModel):
    """Liveness probe response"""
    alive: bool


@router.get("/", response_model=HealthResponse)
async def health_check():
    """
    Comprehensive health check endpoint
    Returns detailed status of all components
    """
    services = []
    overall_status = "healthy"

    # Check Redis
    redis_status = await _check_redis()
    services.append(redis_status)
    if redis_status.status != "healthy":
        overall_status = "degraded"

    # Check MLflow
    mlflow_status = await _check_mlflow()
    services.append(mlflow_status)
    if mlflow_status.status != "healthy":
        overall_status = "degraded"

    # Check Models
    models_status = await _check_models()
    services.append(models_status)
    if models_status.status != "healthy":
        overall_status = "degraded"

    # Check Database
    db_status = await _check_database()
    services.append(db_status)
    if db_status.status != "healthy":
        overall_status = "degraded"

    # System metrics
    system_info = {
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "memory_percent": psutil.virtual_memory().percent,
        "disk_percent": psutil.disk_usage('/').percent,
        "uptime_seconds": _get_uptime(),
    }

    return HealthResponse(
        status=overall_status,
        timestamp=datetime.utcnow().isoformat(),
        version=os.getenv("APP_VERSION", "1.0.0"),
        services=services,
        system=system_info
    )


@router.get("/ready", response_model=ReadinessResponse)
async def readiness_probe():
    """
    Kubernetes readiness probe
    Checks if service is ready to accept traffic
    """
    # Check critical dependencies
    redis_ok = await _quick_check_redis()
    models_ok = await _quick_check_models()

    ready = redis_ok and models_ok
    reason = None if ready else "Dependencies not ready"

    return ReadinessResponse(ready=ready, reason=reason)


@router.get("/live", response_model=LivenessResponse)
async def liveness_probe():
    """
    Kubernetes liveness probe
    Checks if service is alive (simpler than readiness)
    """
    # Just check if process is responding
    return LivenessResponse(alive=True)


@router.get("/startup")
async def startup_probe():
    """
    Kubernetes startup probe
    Checks if application has started successfully
    """
    # Check if critical models are loaded
    models_loaded = await _check_models_loaded()

    if models_loaded:
        return Response(status_code=status.HTTP_200_OK)
    else:
        return Response(status_code=status.HTTP_503_SERVICE_UNAVAILABLE)


# ==========================================
# Helper Functions
# ==========================================

async def _check_redis() -> ServiceStatus:
    """Check Redis connection and performance"""
    import time
    from shared.config import MLConfig

    config = MLConfig()
    start = time.time()

    try:
        client = redis.Redis(
            host=config.redis_host,
            port=config.redis_port,
            password=config.redis_password,
            socket_connect_timeout=2
        )

        # Test connection
        client.ping()

        # Get info
        info = client.info()
        latency = (time.time() - start) * 1000

        return ServiceStatus(
            name="redis",
            status="healthy",
            message="Connected",
            latency_ms=latency,
            details={
                "version": info.get("redis_version"),
                "connected_clients": info.get("connected_clients"),
                "used_memory_human": info.get("used_memory_human")
            }
        )
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return ServiceStatus(
            name="redis",
            status="unhealthy",
            message=str(e)
        )


async def _check_mlflow() -> ServiceStatus:
    """Check MLflow tracking server"""
    import time
    from shared.config import MLConfig
    import requests

    config = MLConfig()
    start = time.time()

    try:
        # Ping MLflow server
        response = requests.get(
            f"{config.mlflow_tracking_uri}/health",
            timeout=2
        )
        latency = (time.time() - start) * 1000

        if response.status_code == 200:
            return ServiceStatus(
                name="mlflow",
                status="healthy",
                message="Connected",
                latency_ms=latency,
                details={"tracking_uri": config.mlflow_tracking_uri}
            )
        else:
            return ServiceStatus(
                name="mlflow",
                status="degraded",
                message=f"HTTP {response.status_code}",
                latency_ms=latency
            )
    except Exception as e:
        logger.error(f"MLflow health check failed: {e}")
        return ServiceStatus(
            name="mlflow",
            status="unhealthy",
            message=str(e)
        )


async def _check_models() -> ServiceStatus:
    """Check if models are loaded and accessible"""
    from pathlib import Path
    from shared.config import MLConfig

    config = MLConfig()
    model_path = Path(config.model_storage_path)

    try:
        # Check if model directory exists
        if not model_path.exists():
            return ServiceStatus(
                name="models",
                status="degraded",
                message="Model directory not found",
                details={"path": str(model_path)}
            )

        # Count available models
        model_dirs = [d for d in model_path.iterdir() if d.is_dir()]

        return ServiceStatus(
            name="models",
            status="healthy",
            message=f"{len(model_dirs)} model(s) available",
            details={
                "model_path": str(model_path),
                "model_count": len(model_dirs),
                "models": [d.name for d in model_dirs]
            }
        )
    except Exception as e:
        logger.error(f"Models health check failed: {e}")
        return ServiceStatus(
            name="models",
            status="unhealthy",
            message=str(e)
        )


async def _check_database() -> ServiceStatus:
    """Check PostgreSQL database connection"""
    import time
    from shared.config import MLConfig
    import psycopg2

    config = MLConfig()
    start = time.time()

    try:
        # Parse DATABASE_URL
        # Format: postgresql://user:pass@host:port/db
        conn = psycopg2.connect(config.database_url)
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        db_version = cursor.fetchone()[0]
        cursor.close()
        conn.close()

        latency = (time.time() - start) * 1000

        return ServiceStatus(
            name="database",
            status="healthy",
            message="Connected",
            latency_ms=latency,
            details={"version": db_version.split()[0:2]}
        )
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return ServiceStatus(
            name="database",
            status="unhealthy",
            message=str(e)
        )


async def _quick_check_redis() -> bool:
    """Quick Redis connectivity check for readiness probe"""
    try:
        from shared.config import MLConfig
        config = MLConfig()
        client = redis.Redis(
            host=config.redis_host,
            port=config.redis_port,
            password=config.redis_password,
            socket_connect_timeout=1
        )
        client.ping()
        return True
    except:
        return False


async def _quick_check_models() -> bool:
    """Quick model availability check"""
    try:
        from pathlib import Path
        from shared.config import MLConfig
        config = MLConfig()
        return Path(config.model_storage_path).exists()
    except:
        return False


async def _check_models_loaded() -> bool:
    """Check if critical models are loaded in memory"""
    # This would check your model cache
    # For now, just check if model files exist
    return await _quick_check_models()


def _get_uptime() -> float:
    """Get application uptime in seconds"""
    import time
    # You'd track start time in your app initialization
    # For now, return process uptime
    return time.time() - psutil.Process(os.getpid()).create_time()
