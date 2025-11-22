from __future__ import annotations

from datetime import datetime
from typing import Annotated

from app.schemas.ohlcv import Interval

from fastapi import APIRouter, HTTPException, Query, status

router = APIRouter(prefix="/lineage", tags=["lineage"])


@router.get("", status_code=status.HTTP_200_OK)
async def get_lineage(
    asset: Annotated[str, Query(description="Asset symbol", min_length=1)],
    start: Annotated[datetime, Query(description="Range start (inclusive)")],
    end: Annotated[datetime, Query(description="Range end (exclusive)")],
    interval: Annotated[Interval, Query(description="Candle interval")],
) -> dict:
    """Return lineage entries for the requested window (stub)."""

    if end <= start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end must be after start")

    return {"items": [], "filters": {"asset": asset, "interval": interval.value, "start": start, "end": end}}


__all__ = ["router"]
