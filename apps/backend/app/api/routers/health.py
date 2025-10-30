from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.core.settings import Settings, get_settings
from app.schemas.health import HealthStatus, build_health_status

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=HealthStatus,
    status_code=status.HTTP_200_OK,
    summary="Service readiness check",
)
def get_health_status(settings: Settings = Depends(get_settings)) -> HealthStatus:
    """Return a contract-compliant health payload."""

    return build_health_status(version=settings.app_version)


__all__ = ["router"]
