from __future__ import annotations

from typing import Protocol

from app.core.settings import get_settings
from app.schemas.ohlcv import Interval, LineageEntry
from app.services.db import get_database_pool
from app.services.lineage_repository import LineageRepository, LineageRepositoryProtocol


class LineageServiceProtocol(Protocol):
    async def query_lineage(
        self,
        *,
        asset: str,
        start,
        end,
        interval: Interval,
    ) -> list[LineageEntry]:
        ...


class LineageService(LineageServiceProtocol):
    def __init__(self, repository: LineageRepositoryProtocol) -> None:
        self._repository = repository

    async def query_lineage(
        self,
        *,
        asset: str,
        start,
        end,
        interval: Interval,
    ) -> list[LineageEntry]:
        return await self._repository.query_lineage(asset=asset, start=start, end=end, interval=interval)


def get_lineage_service() -> LineageServiceProtocol:
    settings = get_settings()
    pool = get_database_pool(settings)
    repository = LineageRepository(pool)
    return LineageService(repository)


__all__ = ["LineageService", "LineageServiceProtocol", "get_lineage_service"]
