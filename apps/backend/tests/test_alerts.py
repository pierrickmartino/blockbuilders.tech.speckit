from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.schemas.ohlcv import AlertState, AssetStatus, Interval, StatusState
from app.services.alerts import AlertsService, InMemoryAlertRepository, InMemoryEmailTransport, AlertEmailSender


def _status(*, minutes_ago: int, status: StatusState = StatusState.STALE) -> AssetStatus:
    now = datetime.now(timezone.utc)
    latest = now - timedelta(minutes=minutes_ago)
    return AssetStatus(
        asset="BTC",
        interval=Interval.MINUTE,
        coverage_start=latest - timedelta(hours=1),
        coverage_end=latest,
        latest_timestamp=latest,
        freshness_minutes=minutes_ago,
        status=status,
        vendor_status=None,
        alert_status=None,
        last_alerted_at=None,
        last_alert_lag_minutes=None,
    )


@pytest.mark.asyncio
async def test_alerts_dedupe_and_clear_on_recovery() -> None:
    repo = InMemoryAlertRepository()
    transport = InMemoryEmailTransport()
    email_sender = AlertEmailSender(
        sender="alerts@example.com",
        recipients=("ops@example.com",),
        subject_prefix="[OHLCV]",
        status_page_url="http://localhost:3000/status",
        transport=transport,
    )
    service = AlertsService(repository=repo, email_sender=email_sender, threshold_minutes=60)

    stale_status = _status(minutes_ago=120)

    created, cleared = await service.evaluate([stale_status])

    assert len(created) == 1
    assert not cleared
    assert await repo.get_open_event("BTC", Interval.MINUTE) is not None
    assert len(transport.sent_messages) == 1

    # Second evaluation while still stale should not duplicate alerts
    created_again, cleared_again = await service.evaluate([stale_status])
    assert not created_again
    assert not cleared_again
    assert len(transport.sent_messages) == 1

    # Recovery clears the open alert and does not send a new notification
    healthy_status = _status(minutes_ago=5, status=StatusState.HEALTHY)
    created_after_recovery, cleared_after_recovery = await service.evaluate([healthy_status])

    assert not created_after_recovery
    assert len(cleared_after_recovery) == 1
    assert await repo.get_open_event("BTC", Interval.MINUTE) is None
    assert cleared_after_recovery[0].status == AlertState.CLEARED
