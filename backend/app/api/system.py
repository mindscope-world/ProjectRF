from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.database import engine
from app.core.redis import redis_client

router = APIRouter(tags=["system"])


@router.get("/health")
async def health() -> dict:
    """Liveness only: is the process up and serving requests."""
    return {"status": "ok"}


@router.get("/ready")
async def ready() -> JSONResponse:
    """Readiness: can the API actually serve traffic right now."""
    checks = {"database": False, "redis": False}

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:  # noqa: BLE001 - a probe must degrade to 503, never 500
        checks["database"] = False

    try:
        checks["redis"] = bool(await redis_client.ping())
    except Exception:  # noqa: BLE001 - a probe must degrade to 503, never 500
        checks["redis"] = False

    is_ready = all(checks.values())

    return JSONResponse(
        status_code=status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "ok" if is_ready else "unavailable", "checks": checks},
    )
