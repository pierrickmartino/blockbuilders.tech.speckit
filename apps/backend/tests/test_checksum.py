from __future__ import annotations

from copy import deepcopy

from app.schemas.ohlcv import Interval, IssueType
from app.services.checksum import ChecksumHelper
from app.services.ingestion import (
    IngestionService,
    InMemoryIngestionRepository,
    StaticDatasetProvider,
)

import pytest
from tests.fixtures.ohlcv_seed import EXPECTED_CHECKSUMS, EXPECTED_ROW_COUNTS, SEED_CANDLES


@pytest.mark.asyncio
async def test_checksum_helper_matches_fixture() -> None:
    helper = ChecksumHelper()
    digest, rows = helper.compute(SEED_CANDLES[Interval.DAY])

    assert digest == EXPECTED_CHECKSUMS[Interval.DAY]
    assert rows == EXPECTED_ROW_COUNTS[Interval.DAY]


@pytest.mark.asyncio
async def test_upsert_is_idempotent_with_duplicate_buckets() -> None:
    duplicate_dataset = deepcopy(SEED_CANDLES)
    btc_first_candle = duplicate_dataset[Interval.MINUTE][0]
    duplicate_dataset[Interval.MINUTE] = duplicate_dataset[Interval.MINUTE] + (btc_first_candle,)

    repo = InMemoryIngestionRepository()
    service = IngestionService(
        repository=repo,
        checksum=ChecksumHelper(),
        data_provider=StaticDatasetProvider(duplicate_dataset),
    )

    await service.run_backfill(interval=Interval.MINUTE)
    second = await service.run_backfill(interval=Interval.MINUTE)

    assert second.checksum_sha256 == EXPECTED_CHECKSUMS[Interval.MINUTE]
    assert repo.count_candles(interval=Interval.MINUTE) == EXPECTED_ROW_COUNTS[Interval.MINUTE]
    duplicate_entries = [entry for entry in repo.remediation_entries if entry.issue_type is IssueType.DUPLICATE]
    assert len(duplicate_entries) >= 1
