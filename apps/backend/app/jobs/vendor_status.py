from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable

from app.core.settings import get_settings
from app.schemas.ohlcv import VendorState
from app.services.db import get_database_pool
from app.services.vendor_status import VendorStatusPoller, VendorStatusService

import httpx

SUCCESS_STATUS_THRESHOLD = 400
RATE_LIMIT_STATUS = 429

LOGGER = logging.getLogger(__name__)


async def _default_probe() -> tuple[VendorState, dict | None]:
    """Lightweight probe that pings the configured Supabase URL health endpoint."""

    settings = get_settings()
    health_url = f"{str(settings.supabase_url).rstrip('/')}/rest/v1/"  # REST endpoint usually closest to DB
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(health_url)
            if response.status_code < SUCCESS_STATUS_THRESHOLD:
                return VendorState.UP, {"status_code": response.status_code}
            if response.status_code == RATE_LIMIT_STATUS:
                return VendorState.RATE_LIMITED, {"status_code": response.status_code}
            return VendorState.DEGRADED, {"status_code": response.status_code}
    except httpx.HTTPError as exc:  # pragma: no cover - defensive fallback
        LOGGER.warning("vendor health probe failed", exc_info=exc)
        return VendorState.DEGRADED, {"error": str(exc)}


Probe = Callable[[], Awaitable[tuple[VendorState, dict | None]]]


async def refresh_vendor_status(probe: Probe | None = None) -> VendorState:
    """Execute vendor probe and persist cached status. Intended for 10m cron cadence."""

    settings = get_settings()
    pool = get_database_pool(settings)
    poller = VendorStatusPoller(pool)
    resolved_probe: Probe = probe or _default_probe

    # VendorStatusPoller handles error shielding and persistence.
    return await poller.probe_and_record(resolved_probe)  # type: ignore[arg-type]


async def get_cached_vendor_status() -> VendorState | None:
    settings = get_settings()
    pool = get_database_pool(settings)
    service = VendorStatusService(pool)
    status = await service.get_vendor_status()
    return status.status if status else None


__all__ = ["get_cached_vendor_status", "refresh_vendor_status"]
