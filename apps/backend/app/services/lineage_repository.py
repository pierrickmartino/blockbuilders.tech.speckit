from __future__ import annotations

import logging
from typing import Protocol

from app.schemas.ohlcv import Interval, LineageEntry

LOGGER = logging.getLogger(__name__)


class LineageRepositoryProtocol(Protocol):
    async def query_lineage(
        self,
        *,
        asset: str,
        start,
        end,
        interval: Interval,
    ) -> list[LineageEntry]:
        ...


class LineageRepository(LineageRepositoryProtocol):
    def __init__(self, pool) -> None:
        self._pool = pool

    async def query_lineage(
        self,
        *,
        asset: str,
        start,
        end,
        interval: Interval,
    ) -> list[LineageEntry]:
        params = {"asset": asset, "start": start, "end": end, "interval": interval.value}
        try:
            async with self._pool.connection() as conn:
                cursor = await conn.execute(
                    """
                    select id, asset_symbol, bucket_start, interval, run_id, source_vendor, fetched_at, checksum_sha256, checksum_version
                    from lineage
                    where asset_symbol = %(asset)s
                      and interval = %(interval)s
                      and bucket_start >= %(start)s
                      and bucket_start < %(end)s
                    order by bucket_start asc
                    limit 5000
                    """,
                    params,
                )
                rows = await cursor.fetchall()
        except Exception as exc:  # pragma: no cover - defensive fallback
            LOGGER.warning("lineage query failed", exc_info=exc)
            return []

        return [LineageEntry.model_validate(row) for row in rows]


__all__ = ["LineageRepository", "LineageRepositoryProtocol"]
