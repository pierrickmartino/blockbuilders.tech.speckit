from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import Response

from app.services.alerts import AlertsCoordinatorProtocol, get_alerts_service

router = APIRouter(prefix="/alerts", tags=["alerts"])

AlertsServiceDep = Annotated[AlertsCoordinatorProtocol, Depends(get_alerts_service)]


@router.post("/test", status_code=status.HTTP_204_NO_CONTENT)
async def send_test_alert(service: AlertsServiceDep) -> Response:
    """Dispatch a synthetic alert to validate wiring and templates."""

    await service.send_test_alert()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


__all__ = ["router"]
