from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Protocol

from app.config import ASSET_SYMBOLS, DEFAULT_INTERVALS
from app.models.serializers import remediation_from_row
from app.schemas.ohlcv import AssetStatus, Interval, IssueType, RemediationEntry, StatusState, VendorState
from app.services.vendor_status import VendorStatusService

LOGGER = logging.getLogger(__name__)


class StatusRepositoryProtocol(Protocol):
    async def fetch_asset_statuses(self) -> list[AssetStatus]:
        ...

    async def fetch_remediation_entries(
        self,
        *,
        asset: str | None = None,
        issue_type: IssueType | None = None,
    ) -> list[RemediationEntry]:
        ...


class StatusRepository(StatusRepositoryProtocol):
    def __init__(
        self,
        pool,
        *,
        assets: tuple[str, ...] = ASSET_SYMBOLS,
        intervals: tuple[str, ...] = DEFAULT_INTERVALS,
        freshness_threshold_minutes: int = 60,
        vendor_status: VendorStatusService | None = None,
    ) -> None:
        self._pool = pool
        self._assets = assets
        self._intervals = intervals
        self._threshold_minutes = freshness_threshold_minutes
        self._vendor_status = vendor_status

    async def fetch_asset_statuses(self) -> list[AssetStatus]:
        try:
            async with self._pool.connection() as conn:
                cursor = await conn.execute(
                    """
                    with unioned as (
                        select asset_symbol, interval, bucket_start from ohlcv_day
                        union all
                        select asset_symbol, interval, bucket_start from ohlcv_minute
                    )
                    select asset_symbol, interval, min(bucket_start) as coverage_start, max(bucket_start) as coverage_end
                    from unioned
                    group by asset_symbol, interval
                    """
                )
                rows = await cursor.fetchall()
        except Exception as exc:  # pragma: no cover - defensive fallback
            LOGGER.warning("status coverage query failed", exc_info=exc)
            rows = []

        vendor_state = await self._resolve_vendor_state()
        now = datetime.now(UTC)
        indexed = {(row.get("asset_symbol"), row.get("interval")): row for row in rows}

        assets: list[AssetStatus] = []
        for asset in self._assets:
            for interval in self._intervals:
                key = (asset, interval)
                row = indexed.get(key)
                coverage_start = row.get("coverage_start") if row else None
                coverage_end = row.get("coverage_end") if row else None
                latest_timestamp = coverage_end
                freshness_minutes: float | None = None
                status = StatusState.GAP_DETECTED
                if latest_timestamp:
                    freshness_minutes = (now - latest_timestamp).total_seconds() / 60.0
                    if freshness_minutes > self._threshold_minutes:
                        status = StatusState.STALE
                    else:
                        status = StatusState.HEALTHY
                assets.append(
                    AssetStatus(
                        asset=asset,
                        interval=Interval(interval),
                        coverage_start=coverage_start,
                        coverage_end=coverage_end,
                        latest_timestamp=latest_timestamp,
                        freshness_minutes=freshness_minutes,
                        status=status,
                        vendor_status=vendor_state,
                    )
                )

        return assets

    async def fetch_remediation_entries(
        self,
        *,
        asset: str | None = None,
        issue_type: IssueType | None = None,
    ) -> list[RemediationEntry]:
        params = {
            "asset": asset,
            "issue_type": issue_type.value if issue_type else None,
        }
        try:
            async with self._pool.connection() as conn:
                cursor = await conn.execute(
                    """
                    select id, asset_symbol, interval, range_start, range_end, issue_type, detected_at, resolved, resolved_at, run_id, notes
                    from remediation_log
                    where (%(asset)s is null or asset_symbol = %(asset)s)
                      and (%(issue_type)s is null or issue_type = %(issue_type)s)
                    order by detected_at desc
                    limit 200
                    """,
                    params,
                )
                rows = await cursor.fetchall()
        except Exception as exc:  # pragma: no cover - defensive fallback
            LOGGER.warning("remediation query failed", exc_info=exc)
            return []

        return [remediation_from_row(row) for row in rows]

    async def _resolve_vendor_state(self) -> VendorState | None:
        if not self._vendor_status:
            return None
        vendor_status = await self._vendor_status.get_vendor_status()
        return vendor_status.status if vendor_status else None


__all__ = ["StatusRepository", "StatusRepositoryProtocol"]
