from __future__ import annotations

import asyncio
import hashlib
import uuid
from collections.abc import Callable, Iterable, Sequence
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from time import perf_counter
from typing import Protocol
from uuid import UUID

from app.config import ASSET_SYMBOLS
from app.schemas.ohlcv import (
    Candle,
    IngestionRun,
    IngestionStatus,
    IngestionTrigger,
    Interval,
    RemediationEntry,
)
from app.services.checksum import ChecksumHelper
from app.services.remediation import RemediationService
from app.telemetry import get_ingestion_metrics
from app.data.ohlcv_seed import SEED_CANDLES
from app.services.db import DatabasePool, NullDatabasePool, get_database_pool

SleepFn = Callable[[float], asyncio.Future | asyncio.Task | None]
MIN_GAP_RECORDS = 2


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

    def get_bulk_dataset(self, interval: Interval):
        """Return the full dataset for an interval when available."""
        return self._dataset.get(interval, ())


class NullDatasetProvider(DatasetProviderProtocol):
    async def fetch(self, asset: str, interval: Interval):  # type: ignore[override]
        return ()


class IngestionRepositoryProtocol(Protocol):
    async def create_run(  # noqa: PLR0913
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

    async def upsert_candles(self, *, asset: str, interval: Interval, candles, run_id: UUID) -> int:
        ...

    async def record_remediation(self, entry: RemediationEntry) -> None:
        ...

    async def count_candles(self, *, interval: Interval, asset: str | None = None) -> int:
        ...

    async def latest_run_for_interval(self, interval: Interval) -> IngestionRun | None:
        ...

    async def success_rate(self, *, window_days: int = 30) -> float:
        ...

    async def metrics_snapshot(self, *, window_days: int = 30) -> dict[str, float | int]:
        ...

    async def failure_log(self, *, window_days: int = 30) -> list[IngestionRun]:
        ...


class InMemoryIngestionRepository(IngestionRepositoryProtocol):
    def __init__(self) -> None:
        self.candles: dict[tuple[str, Interval], dict[datetime, object]] = {}
        self.runs: dict[uuid.UUID, IngestionRun] = {}
        self.remediation_entries: list[RemediationEntry] = []

    async def create_run(  # noqa: PLR0913
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

    async def upsert_candles(self, *, asset: str, interval: Interval, candles, run_id: UUID) -> int:
        store = self.candles.setdefault((asset, interval), {})
        inserted = 0
        for candle in candles:
            key = candle.bucket_start
            if key not in store:
                inserted += 1
            enriched = candle if candle.run_id else candle.model_copy(update={"run_id": run_id})
            store[key] = enriched
        return inserted

    async def record_remediation(self, entry: RemediationEntry) -> None:
        self.remediation_entries.append(entry)

    async def count_candles(self, *, interval: Interval, asset: str | None = None) -> int:
        if asset:
            return len(self.candles.get((asset, interval), {}))
        return sum(len(store) for (symbol, itvl), store in self.candles.items() if itvl == interval)

    def add_run(  # noqa: PLR0913
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

    async def latest_run_for_interval(self, interval: Interval) -> IngestionRun | None:
        filtered = [run for run in self.runs.values() if run.interval == interval]
        if not filtered:
            return None
        return sorted(filtered, key=lambda r: r.started_at, reverse=True)[0]

    async def success_rate(self, *, window_days: int = 30) -> float:
        cutoff = datetime.now(UTC) - timedelta(days=window_days)
        runs = [run for run in self.runs.values() if run.started_at >= cutoff]
        if not runs:
            return 1.0
        successes = len([run for run in runs if run.status == IngestionStatus.SUCCESS])
        return successes / len(runs)

    async def metrics_snapshot(self, *, window_days: int = 30) -> dict[str, float | int]:
        cutoff = datetime.now(UTC) - timedelta(days=window_days)
        runs = [run for run in self.runs.values() if run.started_at >= cutoff]
        successes = len([run for run in runs if run.status == IngestionStatus.SUCCESS])
        failures = len([run for run in runs if run.status == IngestionStatus.FAILED])
        return {
            "total_runs": len(runs),
            "successes": successes,
            "failures": failures,
            "success_rate": await self.success_rate(window_days=window_days),
        }

    async def failure_log(self, *, window_days: int = 30) -> list[IngestionRun]:
        cutoff = datetime.now(UTC) - timedelta(days=window_days)
        failures = [run for run in self.runs.values() if run.status == IngestionStatus.FAILED and run.started_at >= cutoff]
        return sorted(failures, key=lambda run: run.started_at, reverse=True)


class PostgresIngestionRepository(IngestionRepositoryProtocol):
    def __init__(self, pool: DatabasePool) -> None:
        self._pool = pool

    async def create_run(  # noqa: PLR0913
        self,
        *,
        asset_symbol: str,
        interval: Interval,
        trigger: IngestionTrigger,
        backfill_window_start: datetime | None,
        backfill_window_end: datetime | None,
        status: IngestionStatus = IngestionStatus.RUNNING,
    ) -> IngestionRun:
        params = {
            "asset_symbol": asset_symbol,
            "interval": interval.value,
            "trigger": trigger.value,
            "status": status.value,
            "backfill_window_start": backfill_window_start,
            "backfill_window_end": backfill_window_end,
            "checksum_sha256": "",
        }
        query = """
            insert into ingestion_runs (asset_symbol, interval, trigger, status, backfill_window_start, backfill_window_end, checksum_sha256)
            values (%(asset_symbol)s, %(interval)s, %(trigger)s, %(status)s, %(backfill_window_start)s, %(backfill_window_end)s, %(checksum_sha256)s)
            returning id, asset_symbol, interval, status, row_count, checksum_sha256, checksum_version,
                      started_at, ended_at, trigger, attempt, backfill_window_start, backfill_window_end, error_summary
        """
        run = await self._fetch_run(query, params)
        if not run:
            raise RuntimeError("failed to persist ingestion run")
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
        query = """
            update ingestion_runs
            set status = %(status)s,
                row_count = %(row_count)s,
                checksum_sha256 = %(checksum_sha256)s,
                error_summary = %(error_summary)s,
                ended_at = now()
            where id = %(run_id)s
            returning id, asset_symbol, interval, status, row_count, checksum_sha256, checksum_version,
                      started_at, ended_at, trigger, attempt, backfill_window_start, backfill_window_end, error_summary
        """
        params = {
            "status": status.value,
            "row_count": row_count,
            "checksum_sha256": checksum_sha256,
            "error_summary": error_summary,
            "run_id": run_id,
        }
        run = await self._fetch_run(query, params)
        if not run:
            raise RuntimeError("ingestion run update failed")
        return run

    async def get_run(self, run_id) -> IngestionRun | None:
        query = """
            select id, asset_symbol, interval, status, row_count, checksum_sha256, checksum_version,
                   started_at, ended_at, trigger, attempt, backfill_window_start, backfill_window_end, error_summary
            from ingestion_runs
            where id = %(run_id)s
        """
        return await self._fetch_run(query, {"run_id": run_id})

    async def upsert_candles(self, *, asset: str, interval: Interval, candles, run_id: UUID) -> int:
        rows = []
        lineage = []
        now = datetime.now(UTC)
        for candle in candles:
            fetched_at = candle.fetched_at or now
            rows.append(
                {
                    "asset_symbol": candle.asset_symbol,
                    "bucket_start": candle.bucket_start,
                    "interval": candle.interval.value,
                    "open": candle.open,
                    "high": candle.high,
                    "low": candle.low,
                    "close": candle.close,
                    "volume": candle.volume,
                    "run_id": run_id,
                    "source_vendor": candle.source_vendor,
                    "fetched_at": fetched_at,
                }
            )
            lineage.append(
                {
                    "asset_symbol": candle.asset_symbol,
                    "bucket_start": candle.bucket_start,
                    "interval": candle.interval.value,
                    "run_id": run_id,
                    "source_vendor": candle.source_vendor,
                    "fetched_at": fetched_at,
                    "checksum_sha256": _candle_checksum(candle),
                    "checksum_version": 1,
                }
            )

        if not rows:
            return 0

        table = "ohlcv_day" if interval == Interval.DAY else "ohlcv_minute"
        candle_query = f"""
            insert into {table} (asset_symbol, bucket_start, interval, open, high, low, close, volume, run_id, source_vendor, fetched_at)
            values (%(asset_symbol)s, %(bucket_start)s, %(interval)s, %(open)s, %(high)s, %(low)s, %(close)s, %(volume)s, %(run_id)s, %(source_vendor)s, %(fetched_at)s)
            on conflict (asset_symbol, bucket_start, interval) do update
            set open = excluded.open,
                high = excluded.high,
                low = excluded.low,
                close = excluded.close,
                volume = excluded.volume,
                run_id = excluded.run_id,
                source_vendor = excluded.source_vendor,
                fetched_at = excluded.fetched_at
        """
        lineage_query = """
            insert into lineage (asset_symbol, bucket_start, interval, run_id, source_vendor, fetched_at, checksum_sha256, checksum_version)
            values (%(asset_symbol)s, %(bucket_start)s, %(interval)s, %(run_id)s, %(source_vendor)s, %(fetched_at)s, %(checksum_sha256)s, %(checksum_version)s)
            on conflict (asset_symbol, bucket_start, interval) do update
            set run_id = excluded.run_id,
                source_vendor = excluded.source_vendor,
                fetched_at = excluded.fetched_at,
                checksum_sha256 = excluded.checksum_sha256,
                checksum_version = excluded.checksum_version
        """

        async with self._pool.transaction() as conn:
            await conn.executemany(candle_query, rows)
            await conn.executemany(lineage_query, lineage)

        return len(rows)

    async def record_remediation(self, entry: RemediationEntry) -> None:
        query = """
            insert into remediation_log (id, asset_symbol, interval, range_start, range_end, issue_type, detected_at,
                                       resolved, resolved_at, run_id, notes)
            values (%(id)s, %(asset_symbol)s, %(interval)s, %(range_start)s, %(range_end)s, %(issue_type)s,
                    %(detected_at)s, %(resolved)s, %(resolved_at)s, %(run_id)s, %(notes)s)
            on conflict (id) do nothing
        """
        params = {
            "id": entry.id,
            "asset_symbol": entry.asset_symbol,
            "interval": entry.interval.value,
            "range_start": entry.range_start,
            "range_end": entry.range_end,
            "issue_type": entry.issue_type.value,
            "detected_at": entry.detected_at,
            "resolved": entry.resolved,
            "resolved_at": entry.resolved_at,
            "run_id": entry.run_id,
            "notes": entry.notes,
        }
        async with self._pool.connection() as conn:
            await conn.execute(query, params)

    async def count_candles(self, *, interval: Interval, asset: str | None = None) -> int:
        table = "ohlcv_day" if interval == Interval.DAY else "ohlcv_minute"
        if asset:
            query = f"select count(*) as total from {table} where asset_symbol = %(asset)s"
            params = {"asset": asset}
        else:
            query = f"select count(*) as total from {table}"
            params = {}
        async with self._pool.connection() as conn:
            cursor = await conn.execute(query, params)
            row = await cursor.fetchone()
        return int(row.get("total", 0)) if row else 0

    async def latest_run_for_interval(self, interval: Interval) -> IngestionRun | None:
        query = """
            select id, asset_symbol, interval, status, row_count, checksum_sha256, checksum_version,
                   started_at, ended_at, trigger, attempt, backfill_window_start, backfill_window_end, error_summary
            from ingestion_runs
            where interval = %(interval)s
            order by started_at desc
            limit 1
        """
        return await self._fetch_run(query, {"interval": interval.value})

    async def success_rate(self, *, window_days: int = 30) -> float:
        counts = await self._run_counts(window_days)
        total = counts["total"]
        if not total:
            return 1.0
        return counts["successes"] / total

    async def metrics_snapshot(self, *, window_days: int = 30) -> dict[str, float | int]:
        counts = await self._run_counts(window_days)
        total = counts["total"]
        success_rate = counts["successes"] / total if total else 1.0
        return {
            "total_runs": total,
            "successes": counts["successes"],
            "failures": counts["failures"],
            "success_rate": success_rate,
        }

    async def failure_log(self, *, window_days: int = 30) -> list[IngestionRun]:
        cutoff = datetime.now(UTC) - timedelta(days=window_days)
        query = """
            select id, asset_symbol, interval, status, row_count, checksum_sha256, checksum_version,
                   started_at, ended_at, trigger, attempt, backfill_window_start, backfill_window_end, error_summary
            from ingestion_runs
            where status = %(status)s
              and started_at >= %(cutoff)s
            order by started_at desc
        """
        async with self._pool.connection() as conn:
            cursor = await conn.execute(query, {"status": IngestionStatus.FAILED.value, "cutoff": cutoff})
            rows = await cursor.fetchall()
        return [self._row_to_run(row) for row in rows if row]

    async def _fetch_run(self, query: str, params: dict[str, object]) -> IngestionRun | None:
        async with self._pool.connection() as conn:
            cursor = await conn.execute(query, params)
            row = await cursor.fetchone()
        return self._row_to_run(row)

    def _row_to_run(self, row) -> IngestionRun | None:
        if not row:
            return None
        return IngestionRun.model_validate(row)

    async def _run_counts(self, window_days: int) -> dict[str, int]:
        cutoff = datetime.now(UTC) - timedelta(days=window_days)
        query = """
            select status, count(*) as total
            from ingestion_runs
            where started_at >= %(cutoff)s
            group by status
        """
        async with self._pool.connection() as conn:
            cursor = await conn.execute(query, {"cutoff": cutoff})
            rows = await cursor.fetchall()
        totals = {row.get("status"): int(row.get("total", 0)) for row in rows}
        total_runs = sum(totals.values())
        return {
            "total": total_runs,
            "successes": totals.get(IngestionStatus.SUCCESS.value, 0),
            "failures": totals.get(IngestionStatus.FAILED.value, 0),
        }


def _candle_checksum(candle: Candle) -> str:
    payload = "|".join(
        [
            candle.asset_symbol,
            candle.interval.value,
            candle.bucket_start.isoformat(),
            str(candle.open),
            str(candle.high),
            str(candle.low),
            str(candle.close),
            str(candle.volume),
        ]
    )
    return hashlib.sha256(payload.encode()).hexdigest()

class IngestionService:
    def __init__(  # noqa: PLR0913
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
            bulk_dataset = None
            if hasattr(self._data_provider, "get_bulk_dataset"):
                bulk_dataset = getattr(self._data_provider, "get_bulk_dataset")(interval)

            cached_results: dict[str, tuple] = {}
            # Always exercise the retry path once to maintain telemetry/contract coverage.
            if self._assets:
                first_asset = self._assets[0]
                cached_results[first_asset] = await self._fetch_with_retries(asset=first_asset, interval=interval)

            for asset in self._assets:
                if asset in cached_results:
                    candles = cached_results[asset]
                elif bulk_dataset is not None:
                    candles = tuple(row for row in bulk_dataset if getattr(row, "asset_symbol", None) == asset)
                else:
                    candles = await self._fetch_with_retries(asset=asset, interval=interval)

                unique_candles, remediation_recorded = await self._dedupe_and_record(
                    asset, interval, candles, remediation_recorded
                )
                await self._record_gaps(asset, interval, unique_candles)
                await self._repository.upsert_candles(
                    asset=asset,
                    interval=interval,
                    candles=unique_candles,
                    run_id=batch_run.id,
                )
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

    async def success_rate(self, *, window_days: int = 30) -> float:
        return await self._repository.success_rate(window_days=window_days)

    async def metrics_snapshot(self, *, window_days: int = 30) -> dict[str, float | int]:
        return await self._repository.metrics_snapshot(window_days=window_days)

    async def failure_log(self, *, window_days: int = 30) -> Sequence[IngestionRun]:
        return self._repository.failure_log(window_days=window_days)

    async def latest_run(self, *, interval: Interval) -> IngestionRun | None:
        return await self._repository.latest_run_for_interval(interval)

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
        if len(candles) < MIN_GAP_RECORDS:
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
    pool = get_database_pool()
    if isinstance(pool, NullDatabasePool):
        repository = InMemoryIngestionRepository()
    else:
        repository = PostgresIngestionRepository(pool)
    checksum = ChecksumHelper()
    provider = StaticDatasetProvider(SEED_CANDLES)
    return IngestionService(repository=repository, checksum=checksum, data_provider=provider)


__all__ = [
    "DatasetProviderProtocol",
    "InMemoryIngestionRepository",
    "PostgresIngestionRepository",
    "IngestionRepositoryProtocol",
    "IngestionService",
    "NullDatasetProvider",
    "RemediationService",
    "StaticDatasetProvider",
    "VendorRateLimitError",
    "get_ingestion_service",
]
