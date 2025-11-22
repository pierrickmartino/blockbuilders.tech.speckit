from __future__ import annotations

from datetime import datetime
from typing import Annotated

from app.schemas.ohlcv import Interval, LineageResponse
from app.services.lineage_service import LineageServiceProtocol, get_lineage_service

from fastapi import APIRouter, Depends, HTTPException, Query, status

router = APIRouter(prefix="/lineage", tags=["lineage"])

LineageServiceDep = Annotated[LineageServiceProtocol, Depends(get_lineage_service)]


@router.get("", status_code=status.HTTP_200_OK, response_model=LineageResponse)
async def get_lineage(
    asset: Annotated[str, Query(description="Asset symbol", min_length=1)],
    start: Annotated[datetime, Query(description="Range start (inclusive)")],
    end: Annotated[datetime, Query(description="Range end (exclusive)")],
    interval: Annotated[Interval, Query(description="Candle interval")],
    service: LineageServiceDep,
) -> LineageResponse:
    """Return lineage entries for the requested window (stub)."""

    if end <= start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end must be after start")

    items = await service.query_lineage(asset=asset, start=start, end=end, interval=interval)
    return LineageResponse(items=items)


__all__ = ["router", "get_lineage_service"]
