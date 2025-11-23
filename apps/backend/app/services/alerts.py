from __future__ import annotations

import logging
from collections.abc import Iterable
from datetime import UTC, datetime
from email.message import EmailMessage
from typing import Protocol
from uuid import UUID, uuid4

from app.config import ASSET_SYMBOLS
from app.core.settings import Settings, get_settings
from app.models.serializers import alert_event_from_row
from app.schemas.ohlcv import AlertEvent, AlertState, AssetStatus, Interval, StatusState
from app.services.db import get_database_pool

LOGGER = logging.getLogger(__name__)


class AlertRepositoryProtocol(Protocol):
    async def get_open_event(self, asset: str, interval: Interval) -> AlertEvent | None:
        ...

    async def latest_events(self) -> dict[tuple[str, Interval], AlertEvent]:
        ...

    async def create_event(
        self,
        *,
        asset_symbol: str,
        interval: Interval,
        lag_minutes: int,
        threshold_minutes: int,
        run_id: UUID | None = None,
    ) -> AlertEvent:
        ...

    async def mark_cleared(self, alert_id: UUID) -> AlertEvent:
        ...

    async def update_lag(self, alert_id: UUID, *, lag_minutes: int) -> AlertEvent | None:
        ...


class DatabaseAlertRepository(AlertRepositoryProtocol):
    def __init__(self, pool) -> None:
        self._pool = pool

    async def get_open_event(self, asset: str, interval: Interval) -> AlertEvent | None:
        async with self._pool.connection() as conn:
            cursor = await conn.execute(
                """
                select id, asset_symbol, interval, detected_at, lag_minutes, threshold_minutes, status, notified_at, cleared_at, notification_channel, run_id
                from alert_events
                where asset_symbol = %(asset)s
                  and interval = %(interval)s
                  and status = 'open'
                order by detected_at desc
                limit 1
                """,
                {"asset": asset, "interval": interval.value},
            )
            row = await cursor.fetchone()
        return alert_event_from_row(row) if row else None

    async def latest_events(self) -> dict[tuple[str, Interval], AlertEvent]:
        async with self._pool.connection() as conn:
            cursor = await conn.execute(
                """
                select distinct on (asset_symbol, interval) id, asset_symbol, interval, detected_at, lag_minutes, threshold_minutes,
                       status, notified_at, cleared_at, notification_channel, run_id
                from alert_events
                order by asset_symbol, interval, detected_at desc
                """
            )
            rows = await cursor.fetchall()
        return {
            (row.get("asset_symbol"), Interval(str(row.get("interval")))): alert_event_from_row(row)
            for row in rows
        }

    async def create_event(
        self,
        *,
        asset_symbol: str,
        interval: Interval,
        lag_minutes: int,
        threshold_minutes: int,
        run_id: UUID | None = None,
    ) -> AlertEvent:
        async with self._pool.connection() as conn:
            cursor = await conn.execute(
                """
                insert into alert_events (asset_symbol, interval, lag_minutes, threshold_minutes, status, run_id, notified_at)
                values (%(asset_symbol)s, %(interval)s, %(lag_minutes)s, %(threshold_minutes)s, 'open', %(run_id)s, now())
                returning id, asset_symbol, interval, detected_at, lag_minutes, threshold_minutes, status, notified_at, cleared_at, notification_channel, run_id
                """,
                {
                    "asset_symbol": asset_symbol,
                    "interval": interval.value,
                    "lag_minutes": lag_minutes,
                    "threshold_minutes": threshold_minutes,
                    "run_id": run_id,
                },
            )
            row = await cursor.fetchone()
        return alert_event_from_row(row)

    async def mark_cleared(self, alert_id: UUID) -> AlertEvent:
        async with self._pool.connection() as conn:
            cursor = await conn.execute(
                """
                update alert_events
                set status = 'cleared', cleared_at = now()
                where id = %(id)s
                returning id, asset_symbol, interval, detected_at, lag_minutes, threshold_minutes, status, notified_at, cleared_at, notification_channel, run_id
                """,
                {"id": alert_id},
            )
            row = await cursor.fetchone()
        return alert_event_from_row(row)

    async def update_lag(self, alert_id: UUID, *, lag_minutes: int) -> AlertEvent | None:
        async with self._pool.connection() as conn:
            cursor = await conn.execute(
                """
                update alert_events
                set lag_minutes = %(lag_minutes)s
                where id = %(id)s
                returning id, asset_symbol, interval, detected_at, lag_minutes, threshold_minutes, status, notified_at, cleared_at, notification_channel, run_id
                """,
                {"id": alert_id, "lag_minutes": lag_minutes},
            )
            row = await cursor.fetchone()
        return alert_event_from_row(row) if row else None


class InMemoryAlertRepository(AlertRepositoryProtocol):
    def __init__(self) -> None:
        self.events: dict[tuple[str, Interval], AlertEvent] = {}

    async def get_open_event(self, asset: str, interval: Interval) -> AlertEvent | None:
        event = self.events.get((asset, interval))
        if event and event.status == AlertState.OPEN:
            return event
        return None

    async def latest_events(self) -> dict[tuple[str, Interval], AlertEvent]:
        return dict(self.events)

    async def create_event(
        self,
        *,
        asset_symbol: str,
        interval: Interval,
        lag_minutes: int,
        threshold_minutes: int,
        run_id: UUID | None = None,
    ) -> AlertEvent:
        event = AlertEvent(
            id=uuid4(),
            asset_symbol=asset_symbol,
            interval=interval,
            detected_at=datetime.now(UTC),
            lag_minutes=lag_minutes,
            threshold_minutes=threshold_minutes,
            status=AlertState.OPEN,
            notified_at=datetime.now(UTC),
            cleared_at=None,
            notification_channel="email",
            run_id=run_id,
        )
        self.events[(asset_symbol, interval)] = event
        return event

    async def mark_cleared(self, alert_id: UUID) -> AlertEvent:
        for key, event in self.events.items():
            if event.id == alert_id:
                cleared = event.model_copy(update={"status": AlertState.CLEARED, "cleared_at": datetime.now(UTC)})
                self.events[key] = cleared
                return cleared
        raise KeyError(f"alert {alert_id} not found")

    async def update_lag(self, alert_id: UUID, *, lag_minutes: int) -> AlertEvent | None:
        for key, event in self.events.items():
            if event.id == alert_id:
                updated = event.model_copy(update={"lag_minutes": lag_minutes})
                self.events[key] = updated
                return updated
        return None


class EmailTransport(Protocol):
    async def send(self, message: EmailMessage) -> None:
        ...


class InMemoryEmailTransport:
    def __init__(self) -> None:
        self.sent_messages: list[EmailMessage] = []

    async def send(self, message: EmailMessage) -> None:
        self.sent_messages.append(message)


class LoggingEmailTransport:
    def __init__(self) -> None:
        self.sent_messages: list[EmailMessage] = []

    async def send(self, message: EmailMessage) -> None:  # pragma: no cover - side-effect only
        self.sent_messages.append(message)
        LOGGER.info("alert email prepared", extra={"subject": message.get("Subject"), "to": message.get("To")})


class AlertEmailSender:
    def __init__(
        self,
        *,
        sender: str,
        recipients: tuple[str, ...],
        subject_prefix: str,
        status_page_url: str,
        transport: EmailTransport | None = None,
    ) -> None:
        self._sender = sender
        self._recipients = recipients
        self._subject_prefix = subject_prefix.rstrip()
        self._status_page_url = status_page_url
        self._transport = transport or LoggingEmailTransport()

    def _compose(self, alert: AlertEvent, asset_status: AssetStatus) -> EmailMessage:
        subject = f"{self._subject_prefix} Freshness lag for {asset_status.asset} ({asset_status.interval.value})"
        body = (
            "Freshness alert triggered.\n"
            f"Asset: {asset_status.asset}\n"
            f"Interval: {asset_status.interval.value}\n"
            f"Lag minutes: {alert.lag_minutes}\n"
            f"Vendor status: {asset_status.vendor_status or 'unknown'}\n"
            f"Incident id: {alert.id}\n"
            f"Last timestamp: {asset_status.latest_timestamp}\n"
            f"Status page: {self._status_page_url}\n"
        )

        message = EmailMessage()
        message["From"] = self._sender
        message["To"] = ", ".join(self._recipients)
        message["Subject"] = subject
        message.set_content(body)
        return message

    async def send(self, alert: AlertEvent, *, asset_status: AssetStatus) -> None:
        message = self._compose(alert, asset_status)
        await self._transport.send(message)


class AlertsService:
    def __init__(
        self,
        *,
        repository: AlertRepositoryProtocol,
        email_sender: AlertEmailSender,
        threshold_minutes: int,
    ) -> None:
        self._repository = repository
        self._email = email_sender
        self._threshold = threshold_minutes

    async def evaluate(self, assets: Iterable[AssetStatus]):
        created: list[AlertEvent] = []
        cleared: list[AlertEvent] = []

        for asset in assets:
            freshness = asset.freshness_minutes
            if freshness is None:
                continue

            open_event = await self._repository.get_open_event(asset.asset, asset.interval)
            if freshness > self._threshold:
                lag_minutes = int(freshness)
                if open_event:
                    await self._repository.update_lag(open_event.id, lag_minutes=lag_minutes)
                    continue

                alert = await self._repository.create_event(
                    asset_symbol=asset.asset,
                    interval=asset.interval,
                    lag_minutes=lag_minutes,
                    threshold_minutes=self._threshold,
                    run_id=None,
                )
                await self._email.send(alert, asset_status=asset)
                created.append(alert)
            elif open_event:
                cleared_event = await self._repository.mark_cleared(open_event.id)
                cleared.append(cleared_event)

        return created, cleared

    async def send_test_alert(self) -> None:
        sample_asset = ASSET_SYMBOLS[0] if ASSET_SYMBOLS else "ASSET"
        dummy_status = AssetStatus(
            asset=sample_asset,
            interval=Interval.MINUTE,
            coverage_start=None,
            coverage_end=None,
            latest_timestamp=datetime.now(UTC),
            freshness_minutes=120,
            status=StatusState.STALE,
            vendor_status=None,
            alert_status=AlertState.OPEN,
            last_alerted_at=datetime.now(UTC),
            last_alert_lag_minutes=120,
        )
        dummy_event = AlertEvent(
            id=uuid4(),
            asset_symbol=sample_asset,
            interval=Interval.MINUTE,
            detected_at=datetime.now(UTC),
            lag_minutes=0,
            threshold_minutes=self._threshold,
            status=AlertState.OPEN,
            notified_at=datetime.now(UTC),
            cleared_at=None,
            notification_channel="email",
            run_id=None,
        )
        await self._email.send(dummy_event, asset_status=dummy_status)


class AlertsCoordinatorProtocol(Protocol):
    async def evaluate(self, assets: Iterable[AssetStatus]):
        ...

    async def send_test_alert(self) -> None:
        ...


def get_alerts_service(settings: Settings | None = None) -> AlertsService:
    runtime_settings = settings or get_settings()

    pool = get_database_pool(runtime_settings)

    repository = DatabaseAlertRepository(pool)
    email_sender = AlertEmailSender(
        sender=runtime_settings.alert_email_from,
        recipients=runtime_settings.alert_email_to,
        subject_prefix=runtime_settings.alert_subject_prefix,
        status_page_url=str(runtime_settings.status_page_url),
    )
    return AlertsService(
        repository=repository,
        email_sender=email_sender,
        threshold_minutes=runtime_settings.freshness_threshold_minutes,
    )


__all__ = [
    "AlertEmailSender",
    "AlertRepositoryProtocol",
    "AlertsCoordinatorProtocol",
    "AlertsService",
    "DatabaseAlertRepository",
    "EmailTransport",
    "InMemoryAlertRepository",
    "InMemoryEmailTransport",
    "get_alerts_service",
]
