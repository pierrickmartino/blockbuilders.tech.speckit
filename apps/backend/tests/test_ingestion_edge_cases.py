from __future__ import annotations

from datetime import timedelta

import pytest

from app.schemas.ohlcv import Interval, IssueType
from app.services.checksum import ChecksumHelper
from app.services.ingestion import InMemoryIngestionRepository, IngestionService, StaticDatasetProvider, VendorRateLimitError
from tests.fixtures.ohlcv_seed import SEED_CANDLES, make_minute_candles


@pytest.mark.asyncio
async def test_gap_detection_records_remediation() -> None:
    minute_candles = list(make_minute_candles())
    btc_first = minute_candles[0]
    btc_second = minute_candles[1]
    shifted_second = btc_second.model_copy(update={"bucket_start": btc_second.bucket_start + timedelta(minutes=1)})
    minute_candles[1] = shifted_second  # introduce a 1m gap between first and second bucket

    dataset = {**SEED_CANDLES, Interval.MINUTE: tuple(minute_candles)}

    repo = InMemoryIngestionRepository()
    service = IngestionService(
        repository=repo,
        checksum=ChecksumHelper(),
        data_provider=StaticDatasetProvider(dataset),
    )

    await service.run_backfill(interval=Interval.MINUTE)

    gap_entries = [entry for entry in repo.remediation_entries if entry.issue_type is IssueType.GAP]
    assert gap_entries, "Expected a remediation entry for the detected gap"
    gap = gap_entries[0]
    assert gap.range_start == btc_first.bucket_start + timedelta(minutes=1)
    assert gap.range_end == shifted_second.bucket_start - timedelta(minutes=1)


@pytest.mark.asyncio
async def test_vendor_rate_limit_retries_with_backoff_and_single_log() -> None:
    attempts = {"count": 0}

    class FlakyProvider(StaticDatasetProvider):
        async def fetch(self, asset: str, interval: Interval):  # type: ignore[override]
            attempts["count"] += 1
            if attempts["count"] < 3:
                raise VendorRateLimitError("rate limited")
            return await super().fetch(asset, interval)

    backoffs: list[float] = []

    async def record_sleep(seconds: float) -> None:
        backoffs.append(seconds)

    repo = InMemoryIngestionRepository()
    service = IngestionService(
        repository=repo,
        checksum=ChecksumHelper(),
        data_provider=FlakyProvider(SEED_CANDLES),
        sleep_fn=record_sleep,
        max_retries=3,
    )

    run = await service.run_backfill(interval=Interval.DAY)

    assert run.status.value == "success"
    assert attempts["count"] == 3
    assert backoffs and backoffs[0] < backoffs[-1]

    partial_logs = [entry for entry in repo.remediation_entries if entry.issue_type is IssueType.PARTIAL_SOURCE]
    assert len(partial_logs) == 1
