from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.schemas.ohlcv import AssetStatus, Interval, StatusState, VendorState
from app.services.alerts import (
    AlertEmailSender,
    AlertsService,
    InMemoryAlertRepository,
    InMemoryEmailTransport,
)

import pytest


@pytest.mark.asyncio
async def test_email_payload_includes_required_fields() -> None:
    repo = InMemoryAlertRepository()
    transport = InMemoryEmailTransport()
    email_sender = AlertEmailSender(
        sender="alerts@example.com",
        recipients=("alerts@blockbuilders.tech",),
        subject_prefix="[OHLCV]",
        status_page_url="http://localhost:3000/status",
        transport=transport,
    )

    service = AlertsService(repository=repo, email_sender=email_sender, threshold_minutes=60)

    now = datetime.now(UTC)
    stale_status = AssetStatus(
        asset="ETH",
        interval=Interval.MINUTE,
        coverage_start=now - timedelta(hours=2),
        coverage_end=now - timedelta(hours=1),
        latest_timestamp=now - timedelta(hours=1),
        freshness_minutes=90,
        status=StatusState.STALE,
        vendor_status=VendorState.RATE_LIMITED,
        alert_status=None,
        last_alerted_at=None,
        last_alert_lag_minutes=None,
    )

    created, _ = await service.evaluate([stale_status])

    assert created
    assert len(transport.sent_messages) == 1

    message = transport.sent_messages[0]
    body = message.get_content()

    assert message["Subject"].startswith("[OHLCV]")
    assert "ETH" in message["Subject"]
    assert "minute" in body
    assert "90" in body  # lag minutes
    assert "rate_limited" in body
    assert str(created[0].id) in body
    assert "status page" in body.lower()
    assert "http://localhost:3000/status" in body
    assert message["To"] == "alerts@blockbuilders.tech"
