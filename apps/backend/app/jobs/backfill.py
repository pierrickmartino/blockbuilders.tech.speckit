from __future__ import annotations

import asyncio
from datetime import datetime

from app.schemas.ohlcv import IngestionRun, IngestionTrigger, Interval
from app.services.ingestion import IngestionService, get_ingestion_service


async def trigger_backfill_job(
    *,
    interval: Interval = Interval.DAY,
    window_start: datetime | None = None,
    window_end: datetime | None = None,
    service: IngestionService | None = None,
) -> IngestionRun:
    """Entry point used by cron/CLI to execute a backfill run."""

    runtime_service = service or get_ingestion_service()
    return await runtime_service.run_backfill(
        interval=interval,
        window_start=window_start,
        window_end=window_end,
        trigger=IngestionTrigger.SCHEDULED,
    )


def main() -> None:  # pragma: no cover - thin CLI shim
    asyncio.run(trigger_backfill_job())


__all__ = ["trigger_backfill_job", "main"]
