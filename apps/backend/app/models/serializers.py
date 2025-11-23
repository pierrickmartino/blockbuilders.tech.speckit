from __future__ import annotations

from collections.abc import Mapping
from datetime import datetime
from typing import Any
from uuid import UUID

from app.schemas.ohlcv import AlertEvent, AlertState, Interval, IssueType, RemediationEntry


def remediation_from_row(row: Mapping[str, Any]) -> RemediationEntry:
    return RemediationEntry(
        id=_coerce_uuid(row.get("id")),
        asset_symbol=str(row.get("asset_symbol")),
        interval=Interval(str(row.get("interval"))),
        range_start=_coerce_dt(row.get("range_start")),
        range_end=_coerce_dt(row.get("range_end")),
        issue_type=IssueType(str(row.get("issue_type"))),
        detected_at=_coerce_dt(row.get("detected_at")),
        resolved=bool(row.get("resolved")),
        resolved_at=_coerce_optional_dt(row.get("resolved_at")),
        run_id=_coerce_optional_uuid(row.get("run_id")),
        notes=row.get("notes"),
    )


def alert_event_from_row(row: Mapping[str, Any]) -> AlertEvent:
    return AlertEvent(
        id=_coerce_uuid(row.get("id")),
        asset_symbol=str(row.get("asset_symbol")),
        interval=Interval(str(row.get("interval"))),
        detected_at=_coerce_dt(row.get("detected_at")),
        lag_minutes=int(row.get("lag_minutes", 0)),
        threshold_minutes=int(row.get("threshold_minutes", 60)),
        status=AlertState(str(row.get("status"))),
        notified_at=_coerce_optional_dt(row.get("notified_at")),
        cleared_at=_coerce_optional_dt(row.get("cleared_at")),
        notification_channel=str(row.get("notification_channel") or "email"),
        run_id=_coerce_optional_uuid(row.get("run_id")),
    )


def _coerce_dt(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value))


def _coerce_optional_dt(value: Any) -> datetime | None:
    if value is None:
        return None
    return _coerce_dt(value)


def _coerce_uuid(value: Any) -> UUID:
    if isinstance(value, UUID):
        return value
    return UUID(str(value))


def _coerce_optional_uuid(value: Any) -> UUID | None:
    if value is None:
        return None
    return _coerce_uuid(value)


__all__ = ["alert_event_from_row", "remediation_from_row"]
