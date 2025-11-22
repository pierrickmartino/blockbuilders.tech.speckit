from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.jobs import freshness_monitor
from app.schemas.ohlcv import AssetStatus, Interval, StatusState
from app.telemetry import get_freshness_metrics, reset_freshness_metrics


class FakeStatusService:
    async def get_summary(self, only_stale: bool = False):  # pragma: no cover - exercised via evaluate
        return [
            AssetStatus(
                asset="BTC",
                interval=Interval.MINUTE,
                coverage_start=None,
                coverage_end=None,
                latest_timestamp=datetime.now(timezone.utc) - timedelta(minutes=75),
                freshness_minutes=75,
                status=StatusState.STALE,
                vendor_status=None,
                alert_status=None,
                last_alerted_at=None,
                last_alert_lag_minutes=None,
            )
        ]


class FakeAlertsService:
    async def evaluate(self, assets):  # pragma: no cover - exercised via evaluate
        return [object()], []


@pytest.mark.asyncio
async def test_freshness_metrics_recorded(monkeypatch) -> None:
    reset_freshness_metrics()
    monkeypatch.setattr(freshness_monitor, "get_status_service", lambda: FakeStatusService())
    monkeypatch.setattr(freshness_monitor, "get_alerts_service", lambda settings=None: FakeAlertsService())

    await freshness_monitor.evaluate_freshness()

    snapshot = get_freshness_metrics().snapshot()
    assert snapshot["alerts_created"] == 1
    assert snapshot["alerts_cleared"] == 0
    assert snapshot["alerts_open"] == 1
    assert snapshot["lag_samples"]
    assert snapshot["lag_samples"][0]["lag_minutes"] == 75
