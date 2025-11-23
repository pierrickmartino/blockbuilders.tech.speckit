from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.schemas.ohlcv import Interval
from app.services.checksum import ChecksumHelper
from app.services.ingestion import (
    IngestionService,
    InMemoryIngestionRepository,
    StaticDatasetProvider,
    VendorRateLimitError,
)
from app.telemetry import get_ingestion_metrics, reset_ingestion_metrics

import pytest
from tests.fixtures.ohlcv_seed import SEED_CANDLES


@pytest.mark.asyncio
async def test_run_backfill_records_metrics_with_lag() -> None:
    reset_ingestion_metrics()
    repo = InMemoryIngestionRepository()
    service = IngestionService(
        repository=repo,
        checksum=ChecksumHelper(),
        data_provider=StaticDatasetProvider(SEED_CANDLES),
    )

    window_end = datetime.now(UTC) - timedelta(minutes=15)
    await service.run_backfill(interval=Interval.DAY, window_end=window_end)

    snapshot = get_ingestion_metrics().snapshot()
    assert snapshot["runs_total"] == 1
    assert snapshot["successes"] == 1
    assert snapshot["failures"] == 0
    assert snapshot["rows_total"] == len(SEED_CANDLES[Interval.DAY])
    assert snapshot["last_tags"]["interval"] == Interval.DAY.value
    assert snapshot["last_lag_minutes"] >= 15 - 0.5  # allow slight clock skew


class FailingProvider(StaticDatasetProvider):
    async def fetch(self, asset: str, interval: Interval):  # type: ignore[override]
        raise VendorRateLimitError("vendor 503")


@pytest.mark.asyncio
async def test_failed_run_records_metrics_and_error() -> None:
    reset_ingestion_metrics()
    repo = InMemoryIngestionRepository()
    service = IngestionService(
        repository=repo,
        checksum=ChecksumHelper(),
        data_provider=FailingProvider(SEED_CANDLES),
    )

    with pytest.raises(VendorRateLimitError):
        await service.run_backfill(interval=Interval.MINUTE)

    snapshot = get_ingestion_metrics().snapshot()
    assert snapshot["runs_total"] == 1
    assert snapshot["failures"] == 1
    assert snapshot["successes"] == 0
    assert snapshot["rows_total"] == 0
    assert snapshot["last_tags"]["status"] == "failed"
    assert snapshot["recent"][-1]["error_summary"] == "vendor 503"
