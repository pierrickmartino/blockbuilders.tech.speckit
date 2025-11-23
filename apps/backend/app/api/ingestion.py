from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from app.schemas.ohlcv import IngestionRun, Interval
from app.services.ingestion import IngestionService, get_ingestion_service

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query, status
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
    service: IngestionServiceDep,
    request: Annotated[BackfillRequest | None, Body(embed=False)] = None,
) -> IngestionRun:
    """Trigger a checksum-backed backfill across configured assets."""

    payload = request or BackfillRequest()

    return await service.run_backfill(
        interval=payload.interval,
        window_start=payload.window_start,
        window_end=payload.window_end,
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
    interval: Annotated[Interval, Query(description="Interval to query")],
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
    service: IngestionServiceDep,
    window_days: Annotated[
        int,
        Query(ge=1, le=90, description="Lookback window for failure log"),
    ] = 30,
) -> list[IngestionRun]:
    return list(await service.failure_log(window_days=window_days))


__all__ = ["BackfillRequest", "router"]
