from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class Interval(str, Enum):
    MINUTE = "minute"
    DAY = "day"


class IngestionStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"
    RUNNING = "running"


class IngestionTrigger(str, Enum):
    MANUAL = "manual"
    SCHEDULED = "scheduled"


class IssueType(str, Enum):
    GAP = "gap"
    DUPLICATE = "duplicate"
    CHECKSUM_MISMATCH = "checksum_mismatch"
    PARTIAL_SOURCE = "partial_source"


class AlertState(str, Enum):
    OPEN = "open"
    CLEARED = "cleared"


class VendorState(str, Enum):
    UP = "up"
    DEGRADED = "degraded"
    DOWN = "down"
    RATE_LIMITED = "rate_limited"


class StatusState(str, Enum):
    HEALTHY = "healthy"
    STALE = "stale"
    GAP_DETECTED = "gap_detected"


class Asset(BaseModel):
    """Asset metadata persisted in the catalog."""

    id: UUID
    symbol: str
    name: str
    base: str
    quote: str
    vendor_ref: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True, frozen=True)


class Candle(BaseModel):
    """Normalized OHLCV candle used for API responses and domain logic."""

    asset_symbol: str
    bucket_start: datetime
    interval: Interval
    open: Decimal = Field(ge=0)
    high: Decimal = Field(ge=0)
    low: Decimal = Field(ge=0)
    close: Decimal = Field(ge=0)
    volume: Decimal = Field(ge=0)
    run_id: UUID | None = None
    source_vendor: str | None = None
    fetched_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class IngestionRun(BaseModel):
    id: UUID
    asset_symbol: str
    interval: Interval
    status: IngestionStatus
    row_count: int = Field(ge=0)
    checksum_sha256: str
    checksum_version: int = Field(default=1, ge=1)
    started_at: datetime
    ended_at: datetime | None = None
    trigger: IngestionTrigger = IngestionTrigger.SCHEDULED
    attempt: int = Field(default=1, ge=1)
    backfill_window_start: datetime | None = None
    backfill_window_end: datetime | None = None
    error_summary: str | None = None

    model_config = ConfigDict(from_attributes=True)


class LineageEntry(BaseModel):
    id: UUID
    asset_symbol: str
    bucket_start: datetime
    interval: Interval
    run_id: UUID
    source_vendor: str | None = None
    fetched_at: datetime | None = None
    checksum_sha256: str
    checksum_version: int = Field(default=1, ge=1)

    model_config = ConfigDict(from_attributes=True)


class RemediationEntry(BaseModel):
    id: UUID
    asset_symbol: str
    interval: Interval
    range_start: datetime
    range_end: datetime
    issue_type: IssueType
    detected_at: datetime
    run_id: UUID | None = None
    notes: str | None = None
    resolved: bool = False
    resolved_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AlertEvent(BaseModel):
    id: UUID
    asset_symbol: str
    interval: Interval
    detected_at: datetime
    lag_minutes: int = Field(ge=0)
    threshold_minutes: int = Field(default=60, gt=0)
    status: AlertState
    notified_at: datetime | None = None
    cleared_at: datetime | None = None
    notification_channel: str = "email"
    run_id: UUID | None = None

    model_config = ConfigDict(from_attributes=True)


class VendorStatus(BaseModel):
    vendor: str
    status: VendorState
    checked_at: datetime
    details: dict | None = None

    model_config = ConfigDict(from_attributes=True)


class AssetStatus(BaseModel):
    asset: str
    interval: Interval
    coverage_start: datetime | None
    coverage_end: datetime | None
    latest_timestamp: datetime | None
    freshness_minutes: float | None
    status: StatusState
    vendor_status: VendorState | None = None
    alert_status: AlertState | None = None
    last_alerted_at: datetime | None = None
    last_alert_lag_minutes: int | None = None

    model_config = ConfigDict(from_attributes=True)


class PublicAssetStatus(BaseModel):
    """Minimal asset status surface for public/status endpoints."""

    asset: str
    interval: Interval
    coverage_start: datetime | None
    coverage_end: datetime | None
    latest_timestamp: datetime | None
    freshness_minutes: float | None
    status: StatusState
    vendor_status: VendorState | None = None

    model_config = ConfigDict(from_attributes=True)


class StatusSummaryResponse(BaseModel):
    assets: list[AssetStatus]


class PublicStatusSummaryResponse(BaseModel):
    assets: list[PublicAssetStatus]


class RemediationResponse(BaseModel):
    items: list[RemediationEntry]


class LineageResponse(BaseModel):
    items: list[LineageEntry]


__all__ = [
    "AlertEvent",
    "AlertState",
    "Asset",
    "AssetStatus",
    "Candle",
    "IngestionRun",
    "IngestionStatus",
    "IngestionTrigger",
    "Interval",
    "IssueType",
    "PublicAssetStatus",
    "PublicStatusSummaryResponse",
    "LineageEntry",
    "LineageResponse",
    "RemediationEntry",
    "RemediationResponse",
    "StatusState",
    "StatusSummaryResponse",
    "VendorState",
    "VendorStatus",
]
