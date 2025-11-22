from __future__ import annotations

from fastapi import APIRouter, status
from fastapi.responses import Response

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("/test", status_code=status.HTTP_204_NO_CONTENT)
async def send_test_alert() -> Response:
    """Stub endpoint for sending a test alert."""

    return Response(status_code=status.HTTP_204_NO_CONTENT)


__all__ = ["router"]
