from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from time import perf_counter
from typing import Callable, Iterable, Protocol, Sequence

from app.config import ASSET_SYMBOLS
from app.schemas.ohlcv import IngestionRun, IngestionStatus, IngestionTrigger, Interval
from app.services.checksum import ChecksumHelper
from app.services.remediation import RemediationService
from app.telemetry import get_ingestion_metrics

SleepFn = Callable[[float], asyncio.Future | asyncio.Task | None]


class VendorRateLimitError(RuntimeError):
    """Raised when the upstream vendor responds with 429/503."""


class DatasetProviderProtocol(Protocol):
    async def fetch(self, asset: str, interval: Interval) -> Sequence:
        ...


class StaticDatasetProvider(DatasetProviderProtocol):
    def __init__(self, dataset) -> None:
        self._dataset = dataset

    async def fetch(self, asset: str, interval: Interval):  # type: ignore[override]
        rows = self._dataset.get(interval, ())
        return tuple(row for row in rows if getattr(row, "asset_symbol", None) == asset)


class NullDatasetProvider(DatasetProviderProtocol):
    async def fetch(self, asset: str, interval: Interval):  # type: ignore[override]
        return ()


class IngestionRepositoryProtocol(Protocol):
    async def create_run(
        self,
        *,
        asset_symbol: str,
        interval: Interval,
        trigger: IngestionTrigger,
        backfill_window_start: datetime | None,
        backfill_window_end: datetime | None,
        status: IngestionStatus = IngestionStatus.RUNNING,
    ) -> IngestionRun:
        ...

    async def complete_run(
        self,
        run_id,
        *,
        status: IngestionStatus,
        row_count: int,
        checksum_sha256: str,
        error_summary: str | None = None,
    ) -> IngestionRun:
        ...

    async def get_run(self, run_id) -> IngestionRun | None:
        ...

    async def upsert_candles(self, *, asset: str, interval: Interval, candles) -> int:
        ...

    async def record_remediation(self, entry: RemediationEntry) -> None:
        ...

    def count_candles(self, *, interval: Interval, asset: str | None = None) -> int:
        ...

    def latest_run_for_interval(self, interval: Interval) -> IngestionRun | None:
        ...

    def success_rate(self, *, window_days: int = 30) -> float:
        ...

    def metrics_snapshot(self, *, window_days: int = 30) -> dict[str, float | int]:
        ...

    def failure_log(self, *, window_days: int = 30) -> list[IngestionRun]:
        ...


class InMemoryIngestionRepository(IngestionRepositoryProtocol):
    def __init__(self) -> None:
        self.candles: dict[tuple[str, Interval], dict[datetime, object]] = {}
        self.runs: dict[uuid.UUID, IngestionRun] = {}
        self.remediation_entries: list[RemediationEntry] = []

    async def create_run(
        self,
        *,
        asset_symbol: str,
        interval: Interval,
        trigger: IngestionTrigger,
        backfill_window_start: datetime | None,
        backfill_window_end: datetime | None,
        status: IngestionStatus = IngestionStatus.RUNNING,
    ) -> IngestionRun:
        run = IngestionRun(
            id=uuid.uuid4(),
            asset_symbol=asset_symbol,
            interval=interval,
            status=status,
            row_count=0,
            checksum_sha256="",
            started_at=datetime.now(UTC),
            ended_at=None,
            trigger=trigger,
            attempt=1,
            backfill_window_start=backfill_window_start,
            backfill_window_end=backfill_window_end,
        )
        self.runs[run.id] = run
        return run

    async def complete_run(
        self,
        run_id,
        *,
        status: IngestionStatus,
        row_count: int,
        checksum_sha256: str,
        error_summary: str | None = None,
    ) -> IngestionRun:
        run = self.runs[run_id]
        self.runs[run_id] = run.model_copy(
            update={
                "status": status,
                "row_count": row_count,
                "checksum_sha256": checksum_sha256,
                "ended_at": datetime.now(UTC),
                "error_summary": error_summary,
            }
        )
        return self.runs[run_id]

    async def get_run(self, run_id) -> IngestionRun | None:
        return self.runs.get(run_id)

    async def upsert_candles(self, *, asset: str, interval: Interval, candles) -> int:
        store = self.candles.setdefault((asset, interval), {})
        inserted = 0
        for candle in candles:
            key = candle.bucket_start
            if key not in store:
                inserted += 1
            store[key] = candle
        return inserted

    async def record_remediation(self, entry: RemediationEntry) -> None:
        self.remediation_entries.append(entry)

    def count_candles(self, *, interval: Interval, asset: str | None = None) -> int:
        if asset:
            return len(self.candles.get((asset, interval), {}))
        return sum(len(store) for (symbol, itvl), store in self.candles.items() if itvl == interval)

    def add_run(
        self,
        *,
        asset_symbol: str,
        interval: Interval,
        status: IngestionStatus,
        started_at: datetime,
        ended_at: datetime,
        row_count: int = 0,
        checksum_sha256: str = "",
        trigger: IngestionTrigger = IngestionTrigger.MANUAL,
        attempt: int = 1,
        backfill_window_start: datetime | None = None,
        backfill_window_end: datetime | None = None,
        error_summary: str | None = None,
    ) -> IngestionRun:
        run = IngestionRun(
            id=uuid.uuid4(),
            asset_symbol=asset_symbol,
            interval=interval,
            status=status,
            row_count=row_count,
            checksum_sha256=checksum_sha256,
            started_at=started_at,
            ended_at=ended_at,
            trigger=trigger,
            attempt=attempt,
            backfill_window_start=backfill_window_start,
            backfill_window_end=backfill_window_end,
            error_summary=error_summary,
        )
        self.runs[run.id] = run
        return run

    def latest_run_for_interval(self, interval: Interval) -> IngestionRun | None:
        filtered = [run for run in self.runs.values() if run.interval == interval]
        if not filtered:
            return None
        return sorted(filtered, key=lambda r: r.started_at, reverse=True)[0]

    def success_rate(self, *, window_days: int = 30) -> float:
        cutoff = datetime.now(UTC) - timedelta(days=window_days)
        runs = [run for run in self.runs.values() if run.started_at >= cutoff]
        if not runs:
            return 1.0
        successes = len([run for run in runs if run.status == IngestionStatus.SUCCESS])
        return successes / len(runs)

    def metrics_snapshot(self, *, window_days: int = 30) -> dict[str, float | int]:
        cutoff = datetime.now(UTC) - timedelta(days=window_days)
        runs = [run for run in self.runs.values() if run.started_at >= cutoff]
        successes = len([run for run in runs if run.status == IngestionStatus.SUCCESS])
        failures = len([run for run in runs if run.status == IngestionStatus.FAILED])
        return {
            "total_runs": len(runs),
            "successes": successes,
            "failures": failures,
            "success_rate": self.success_rate(window_days=window_days),
        }

    def failure_log(self, *, window_days: int = 30) -> list[IngestionRun]:
        cutoff = datetime.now(UTC) - timedelta(days=window_days)
        failures = [run for run in self.runs.values() if run.status == IngestionStatus.FAILED and run.started_at >= cutoff]
        return sorted(failures, key=lambda run: run.started_at, reverse=True)


class IngestionService:
    def __init__(
        self,
        *,
        repository: IngestionRepositoryProtocol,
        checksum: ChecksumHelper,
        data_provider: DatasetProviderProtocol,
        assets: Iterable[str] = ASSET_SYMBOLS,
        max_retries: int = 3,
        sleep_fn: Callable[[float], object] | None = None,
        remediation: RemediationService | None = None,
    ) -> None:
        self._repository = repository
        self._checksum = checksum
        self._data_provider = data_provider
        self._assets = tuple(assets)
        self._max_retries = max(1, max_retries)
        self._sleep = sleep_fn or asyncio.sleep
        self._remediation = remediation or RemediationService(repository)

    async def run_backfill(
        self,
        *,
        interval: Interval,
        window_start: datetime | None = None,
        window_end: datetime | None = None,
        trigger: IngestionTrigger = IngestionTrigger.MANUAL,
    ) -> IngestionRun:
        metrics = get_ingestion_metrics()
        started_at = perf_counter()
        all_candles = []
        remediation_recorded = False

        batch_run = await self._repository.create_run(
            asset_symbol="*",
            interval=interval,
            trigger=trigger,
            backfill_window_start=window_start,
            backfill_window_end=window_end,
        )
        try:
            for asset in self._assets:
                candles = await self._fetch_with_retries(asset=asset, interval=interval)
                unique_candles, remediation_recorded = await self._dedupe_and_record(
                    asset, interval, candles, remediation_recorded
                )
                await self._record_gaps(asset, interval, unique_candles)
                await self._repository.upsert_candles(asset=asset, interval=interval, candles=unique_candles)
                all_candles.extend(unique_candles)

            checksum, row_count = self._checksum.compute(all_candles)
            run = await self._repository.complete_run(
                batch_run.id,
                status=IngestionStatus.SUCCESS,
                row_count=row_count,
                checksum_sha256=checksum,
            )
            duration_ms = (perf_counter() - started_at) * 1000
            metrics.record_run(
                status=IngestionStatus.SUCCESS.value,
                interval=interval.value,
                trigger=trigger.value,
                rows=row_count,
                duration_ms=duration_ms,
                lag_minutes=self._compute_lag(window_end),
                asset_symbol="*",
            )
            return run
        except Exception as exc:  # pragma: no cover - exercised via contract test path
            duration_ms = (perf_counter() - started_at) * 1000
            lag_minutes = self._compute_lag(window_end)
            try:
                await self._repository.complete_run(
                    batch_run.id,
                    status=IngestionStatus.FAILED,
                    row_count=len(all_candles),
                    checksum_sha256="",
                    error_summary=str(exc),
                )
            finally:
                metrics.record_run(
                    status=IngestionStatus.FAILED.value,
                    interval=interval.value,
                    trigger=trigger.value,
                    rows=len(all_candles),
                    duration_ms=duration_ms,
                    lag_minutes=lag_minutes,
                    asset_symbol="*",
                    error_summary=str(exc),
                )
            raise

    async def get_run(self, run_id) -> IngestionRun | None:
        return await self._repository.get_run(run_id)

    def success_rate(self, *, window_days: int = 30) -> float:
        return self._repository.success_rate(window_days=window_days)

    def metrics_snapshot(self, *, window_days: int = 30) -> dict[str, float | int]:
        return self._repository.metrics_snapshot(window_days=window_days)

    async def failure_log(self, *, window_days: int = 30) -> Sequence[IngestionRun]:
        return self._repository.failure_log(window_days=window_days)

    async def latest_run(self, *, interval: Interval) -> IngestionRun | None:
        return self._repository.latest_run_for_interval(interval)

    async def _fetch_with_retries(self, *, asset: str, interval: Interval):
        attempt = 0
        last_error: Exception | None = None
        remediation_logged = False
        while attempt < self._max_retries:
            try:
                return await self._data_provider.fetch(asset, interval)
            except VendorRateLimitError as exc:  # pragma: no cover - guarded by tests
                last_error = exc
                if not remediation_logged:
                    await self._record_partial_source(asset, interval, str(exc))
                    remediation_logged = True
                attempt += 1
                if attempt >= self._max_retries:
                    break
                await self._sleep(2**attempt)
        if last_error:
            # Final attempt failed; re-raise for visibility.
            raise last_error
        return ()

    async def _dedupe_and_record(
        self,
        asset: str,
        interval: Interval,
        candles,
        remediation_recorded: bool,
    ):
        seen = set()
        unique = []
        for candle in candles:
            key = (candle.bucket_start)
            if key in seen:
                if not remediation_recorded:
                    await self._remediation.log_duplicate(asset=asset, interval=interval, bucket_start=candle.bucket_start)
                    remediation_recorded = True
                continue
            seen.add(key)
            unique.append(candle)
        return unique, remediation_recorded

    async def _record_gaps(self, asset: str, interval: Interval, candles) -> None:
        if len(candles) < 2:
            return

        sorted_candles = sorted(candles, key=lambda c: c.bucket_start)
        expected_delta = timedelta(days=1) if interval is Interval.DAY else timedelta(minutes=1)

        for idx in range(1, len(sorted_candles)):
            prev = sorted_candles[idx - 1]
            current = sorted_candles[idx]
            delta = current.bucket_start - prev.bucket_start
            if delta > expected_delta:
                await self._remediation.log_gap(
                    asset=asset,
                    interval=interval,
                    range_start=prev.bucket_start + expected_delta,
                    range_end=current.bucket_start - expected_delta,
                )

    async def _record_partial_source(self, asset: str, interval: Interval, reason: str) -> None:
        await self._remediation.log_partial_source(asset=asset, interval=interval, reason=reason)

    @staticmethod
    def _compute_lag(window_end: datetime | None) -> float | None:
        if not window_end:
            return None
        delta = datetime.now(UTC) - window_end
        return max(delta.total_seconds() / 60, 0.0)


@lru_cache(maxsize=1)
def get_ingestion_service() -> IngestionService:
    # Default in-memory service; production wiring can swap via dependency overrides.
    repository = InMemoryIngestionRepository()
    checksum = ChecksumHelper()
    provider = NullDatasetProvider()
    return IngestionService(repository=repository, checksum=checksum, data_provider=provider)


__all__ = [
    "DatasetProviderProtocol",
    "get_ingestion_service",
    "InMemoryIngestionRepository",
    "IngestionRepositoryProtocol",
    "IngestionService",
    "NullDatasetProvider",
    "RemediationService",
    "StaticDatasetProvider",
    "VendorRateLimitError",
]
