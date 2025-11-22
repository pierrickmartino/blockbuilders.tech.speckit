from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Optional

from app.schemas.ohlcv import VendorState, VendorStatus

LOGGER = logging.getLogger(__name__)


class VendorStatusService:
    """Caches vendor availability with a simple TTL to avoid hammering the DB."""

    def __init__(self, pool, ttl_seconds: int = 900) -> None:
        self._pool = pool
        self._ttl = timedelta(seconds=ttl_seconds)
        self._cached: VendorStatus | None = None
        self._expires_at: datetime | None = None

    async def get_vendor_status(self) -> Optional[VendorStatus]:
        now = datetime.now(UTC)
        if self._cached and self._expires_at and now < self._expires_at:
            return self._cached

        try:
            async with self._pool.connection() as conn:
                cursor = await conn.execute(
                    """
                    select vendor, status, checked_at, details
                    from vendor_status
                    order by checked_at desc
                    limit 1
                    """
                )
                row = await cursor.fetchone()
        except Exception as exc:  # pragma: no cover - defensive fallback
            LOGGER.warning("vendor status lookup failed", exc_info=exc)
            return self._cached

        if not row:
            return None

        self._cached = VendorStatus(
            vendor=row.get("vendor") or "primary",
            status=VendorState(str(row.get("status", VendorState.UP))),
            checked_at=row.get("checked_at"),
            details=row.get("details"),
        )
        self._expires_at = now + self._ttl
        return self._cached


class VendorStatusPoller:
    """Periodic job helper to refresh vendor status with graceful degradation."""

    def __init__(self, pool, *, vendor: str = "primary") -> None:
        self._pool = pool
        self._vendor = vendor

    async def record(self, state: VendorState, *, details: dict | None = None) -> None:
        try:
            async with self._pool.transaction() as conn:
                await conn.execute(
                    """
                    insert into vendor_status (vendor, status, checked_at, details)
                    values (%(vendor)s, %(status)s, now(), %(details)s)
                    on conflict (vendor) do update set
                        status = excluded.status,
                        checked_at = excluded.checked_at,
                        details = excluded.details
                    """,
                    {"vendor": self._vendor, "status": state.value, "details": details},
                )
        except Exception as exc:  # pragma: no cover - network/DB fault tolerance
            LOGGER.warning("vendor status record failed", exc_info=exc)

    async def probe_and_record(self, probe) -> VendorState:
        """Run a probe callable returning (VendorState, details) and persist the result."""

        try:
            state, details = await probe()
        except Exception as exc:  # pragma: no cover - probe failures should not crash the scheduler
            LOGGER.warning("vendor probe failed", exc_info=exc)
            state = VendorState.DEGRADED
            details = {"error": str(exc)}

        await self.record(state, details=details)
        return state


__all__ = ["VendorStatusPoller", "VendorStatusService"]
