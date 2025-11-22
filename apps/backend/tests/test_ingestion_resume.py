from __future__ import annotations

import pytest

from app.schemas.ohlcv import Interval
from app.services.checksum import ChecksumHelper
from app.services.ingestion import InMemoryIngestionRepository, IngestionService, StaticDatasetProvider
from tests.fixtures.ohlcv_seed import EXPECTED_CHECKSUMS, EXPECTED_ROW_COUNTS, SEED_CANDLES


@pytest.mark.asyncio
async def test_resume_after_interrupt_remains_idempotent() -> None:
    partial_minute = SEED_CANDLES[Interval.MINUTE][:10]  # first bucket per asset
    partial_dataset = {**SEED_CANDLES, Interval.MINUTE: partial_minute}

    repo = InMemoryIngestionRepository()
    service = IngestionService(
        repository=repo,
        checksum=ChecksumHelper(),
        data_provider=StaticDatasetProvider(partial_dataset),
    )

    await service.run_backfill(interval=Interval.MINUTE)

    service = IngestionService(
        repository=repo,
        checksum=ChecksumHelper(),
        data_provider=StaticDatasetProvider(SEED_CANDLES),
    )

    final_run = await service.run_backfill(interval=Interval.MINUTE)

    assert repo.count_candles(interval=Interval.MINUTE) == EXPECTED_ROW_COUNTS[Interval.MINUTE]
    assert final_run.checksum_sha256 == EXPECTED_CHECKSUMS[Interval.MINUTE]
