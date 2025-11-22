from __future__ import annotations

import uuid
from datetime import UTC, datetime

from app.schemas.ohlcv import Interval, IssueType, RemediationEntry


class RemediationService:
    def __init__(self, repository) -> None:
        self._repository = repository

    async def log_duplicate(self, *, asset: str, interval: Interval, bucket_start: datetime) -> None:
        entry = RemediationEntry(
            id=uuid.uuid4(),
            asset_symbol=asset,
            interval=interval,
            range_start=bucket_start,
            range_end=bucket_start,
            issue_type=IssueType.DUPLICATE,
            detected_at=datetime.now(UTC),
            resolved=False,
        )
        await self._repository.record_remediation(entry)

    async def log_gap(
        self,
        *,
        asset: str,
        interval: Interval,
        range_start: datetime,
        range_end: datetime,
    ) -> None:
        entry = RemediationEntry(
            id=uuid.uuid4(),
            asset_symbol=asset,
            interval=interval,
            range_start=range_start,
            range_end=range_end,
            issue_type=IssueType.GAP,
            detected_at=datetime.now(UTC),
            resolved=False,
        )
        await self._repository.record_remediation(entry)

    async def log_partial_source(self, *, asset: str, interval: Interval, reason: str) -> None:
        entry = RemediationEntry(
            id=uuid.uuid4(),
            asset_symbol=asset,
            interval=interval,
            range_start=datetime.now(UTC),
            range_end=datetime.now(UTC),
            issue_type=IssueType.PARTIAL_SOURCE,
            detected_at=datetime.now(UTC),
            resolved=False,
            notes=reason,
        )
        await self._repository.record_remediation(entry)


__all__ = ["RemediationService"]
