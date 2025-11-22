from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from app.schemas.ohlcv import IngestionRun, Interval

from fastapi import APIRouter, Body, HTTPException, Path, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/ingestion", tags=["ingestion"])


class BackfillRequest(BaseModel):
    interval: Interval = Interval.DAY
    window_start: datetime | None = None
    window_end: datetime | None = None


@router.post(
    "/backfill",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger backfill for the configured assets",
)
async def trigger_backfill(request: Annotated[BackfillRequest, Body(embed=False)] = BackfillRequest()) -> JSONResponse:
    """Accept a backfill request and return a placeholder acknowledgement."""

    payload = request.model_dump()
    return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content={"accepted": True, "request": payload})


@router.get(
    "/runs/{run_id}",
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    summary="Fetch ingestion run details",
)
async def get_ingestion_run(
    run_id: Annotated[UUID, Path(description="Ingestion run identifier")],
) -> IngestionRun:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="ingestion run lookup not implemented")


__all__ = ["router", "BackfillRequest"]
