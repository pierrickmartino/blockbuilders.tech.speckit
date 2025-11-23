from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.schemas.ohlcv import IngestionStatus, Interval
from app.services.checksum import ChecksumHelper
from app.services.ingestion import (
    IngestionService,
    InMemoryIngestionRepository,
    StaticDatasetProvider,
)

import pytest
from tests.fixtures.ohlcv_seed import SEED_CANDLES

SUCCESS_RATE_THRESHOLD = 0.99


@pytest.mark.asyncio
async def test_success_rate_handles_retries_and_failures() -> None:
    now = datetime.now(UTC)
    repo = InMemoryIngestionRepository()
    service = IngestionService(
        repository=repo,
        checksum=ChecksumHelper(),
        data_provider=StaticDatasetProvider(SEED_CANDLES),
    )

    for _ in range(99):
        repo.add_run(
            asset_symbol="BTC",
            interval=Interval.DAY,
            status=IngestionStatus.SUCCESS,
            started_at=now - timedelta(days=1),
            ended_at=now - timedelta(days=1, minutes=5),
        )
    repo.add_run(
        asset_symbol="BTC",
        interval=Interval.DAY,
        status=IngestionStatus.FAILED,
        started_at=now - timedelta(days=1),
        ended_at=now - timedelta(days=1, minutes=4),
    )

    rate = service.success_rate(window_days=30)
    assert rate >= SUCCESS_RATE_THRESHOLD


@pytest.mark.asyncio
async def test_success_rate_drops_old_runs_beyond_retention() -> None:
    now = datetime.now(UTC)
    repo = InMemoryIngestionRepository()
    service = IngestionService(
        repository=repo,
        checksum=ChecksumHelper(),
        data_provider=StaticDatasetProvider(SEED_CANDLES),
    )

    repo.add_run(
        asset_symbol="ETH",
        interval=Interval.MINUTE,
        status=IngestionStatus.FAILED,
        started_at=now - timedelta(days=45),
        ended_at=now - timedelta(days=45, minutes=3),
    )
    repo.add_run(
        asset_symbol="ETH",
        interval=Interval.MINUTE,
        status=IngestionStatus.SUCCESS,
        started_at=now - timedelta(days=2),
        ended_at=now - timedelta(days=2, minutes=3),
    )

    rate = service.success_rate(window_days=30)
    assert rate == 1.0
    snapshot = repo.metrics_snapshot(window_days=30)
    assert snapshot["total_runs"] == 1
