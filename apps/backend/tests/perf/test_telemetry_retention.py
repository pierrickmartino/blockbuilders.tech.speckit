from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.schemas.ohlcv import IngestionStatus, Interval
from app.services.checksum import ChecksumHelper
from app.services.ingestion import (
    IngestionService,
    InMemoryIngestionRepository,
    StaticDatasetProvider,
)

from tests.fixtures.ohlcv_seed import SEED_CANDLES


def test_metrics_snapshot_trims_runs_beyond_30_days() -> None:
    now = datetime.now(UTC)
    repo = InMemoryIngestionRepository()
    service = IngestionService(
        repository=repo,
        checksum=ChecksumHelper(),
        data_provider=StaticDatasetProvider(SEED_CANDLES),
    )

    repo.add_run(
        asset_symbol="BTC",
        interval=Interval.DAY,
        status=IngestionStatus.SUCCESS,
        started_at=now - timedelta(days=10),
        ended_at=now - timedelta(days=10, minutes=1),
    )
    repo.add_run(
        asset_symbol="BTC",
        interval=Interval.DAY,
        status=IngestionStatus.FAILED,
        started_at=now - timedelta(days=40),
        ended_at=now - timedelta(days=40, minutes=1),
    )

    snapshot = service.metrics_snapshot(window_days=30)

    assert snapshot["total_runs"] == 1
    assert snapshot["success_rate"] == 1.0
