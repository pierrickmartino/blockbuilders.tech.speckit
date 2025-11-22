from __future__ import annotations

import logging

from app.core.settings import get_settings
from app.services.alerts import get_alerts_service
from app.services.status_service import get_status_service
from app.telemetry import get_freshness_metrics

LOGGER = logging.getLogger(__name__)


async def evaluate_freshness():
    """Run the freshness monitor: fetch status summary and dispatch alerts."""

    settings = get_settings()
    status_service = get_status_service()
    alerts_service = get_alerts_service(settings)
    metrics = get_freshness_metrics()

    assets = await status_service.get_summary()
    for asset in assets:
        if asset.freshness_minutes is not None:
            metrics.record_lag(
                asset=asset.asset,
                interval=asset.interval.value,
                lag_minutes=float(asset.freshness_minutes),
            )
    created, cleared = await alerts_service.evaluate(assets)
    metrics.record_alerts(created=len(created), cleared=len(cleared))

    LOGGER.info(
        "freshness evaluation complete",
        extra={"created": len(created), "cleared": len(cleared)},
    )
    return created, cleared


__all__ = ["evaluate_freshness"]
