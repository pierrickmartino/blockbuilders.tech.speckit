from __future__ import annotations

from typing import Protocol

from app.core.settings import get_settings
from app.schemas.ohlcv import AssetStatus, IssueType, RemediationEntry, StatusState
from app.services.db import get_database_pool
from app.services.status_repository import StatusRepository, StatusRepositoryProtocol
from app.services.vendor_status import VendorStatusService


class StatusServiceProtocol(Protocol):
    async def get_summary(self, *, only_stale: bool = False) -> list[AssetStatus]:
        ...

    async def get_remediation_entries(
        self,
        *,
        asset: str | None = None,
        issue_type: IssueType | None = None,
    ) -> list[RemediationEntry]:
        ...


class StatusService(StatusServiceProtocol):
    def __init__(self, repository: StatusRepositoryProtocol) -> None:
        self._repository = repository

    async def get_summary(self, *, only_stale: bool = False) -> list[AssetStatus]:
        assets = await self._repository.fetch_asset_statuses()
        if only_stale:
            assets = [asset for asset in assets if asset.status != StatusState.HEALTHY]
        return assets

    async def get_remediation_entries(
        self,
        *,
        asset: str | None = None,
        issue_type: IssueType | None = None,
    ) -> list[RemediationEntry]:
        return await self._repository.fetch_remediation_entries(asset=asset, issue_type=issue_type)


def get_status_service() -> StatusServiceProtocol:
    settings = get_settings()
    pool = get_database_pool(settings)
    vendor_status = VendorStatusService(pool)
    repository = StatusRepository(
        pool,
        vendor_status=vendor_status,
        freshness_threshold_minutes=getattr(settings, "freshness_threshold_minutes", 60),
    )
    return StatusService(repository)


__all__ = ["StatusService", "StatusServiceProtocol", "get_status_service"]
