from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from app.schemas.ohlcv import IngestionRun, Interval
from app.services.ingestion import IngestionService, get_ingestion_service

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/ingestion", tags=["ingestion"])
IngestionServiceDep = Annotated[IngestionService, Depends(get_ingestion_service)]


class BackfillRequest(BaseModel):
    interval: Interval = Interval.DAY
    window_start: datetime | None = None
    window_end: datetime | None = None


@router.post(
    "/backfill",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger backfill for the configured assets",
    response_model=IngestionRun,
)
async def trigger_backfill(
    request: Annotated[BackfillRequest, Body(embed=False)] = BackfillRequest(),
    service: IngestionServiceDep,
) -> IngestionRun:
    """Trigger a checksum-backed backfill across configured assets."""

    return await service.run_backfill(
        interval=request.interval,
        window_start=request.window_start,
        window_end=request.window_end,
    )


@router.get(
    "/runs/{run_id}",
    status_code=status.HTTP_200_OK,
    summary="Fetch ingestion run details",
    response_model=IngestionRun,
)
async def get_ingestion_run(
    run_id: Annotated[UUID, Path(description="Ingestion run identifier")],
    service: IngestionServiceDep,
) -> IngestionRun:
    run = await service.get_run(run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="run not found")
    return run


@router.get(
    "/runs/latest",
    status_code=status.HTTP_200_OK,
    summary="Fetch latest ingestion run for the given interval",
    response_model=IngestionRun,
)
async def get_latest_ingestion_run(
    interval: Annotated[Interval, Query(description="Interval to query", default=Interval.DAY)],
    service: IngestionServiceDep,
) -> IngestionRun:
    run = await service.latest_run(interval=interval)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="no runs recorded")
    return run


@router.get(
    "/failures",
    status_code=status.HTTP_200_OK,
    summary="Fetch failed ingestion runs within the lookback window",
    response_model=list[IngestionRun],
)
async def get_failure_log(
    window_days: Annotated[int, Query(ge=1, le=90, description="Lookback window for failure log", default=30)] = 30,
    service: IngestionServiceDep,
) -> list[IngestionRun]:
    return list(await service.failure_log(window_days=window_days))


__all__ = ["router", "BackfillRequest"]
