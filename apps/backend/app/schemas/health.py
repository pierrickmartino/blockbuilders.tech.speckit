from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class HealthStatus(BaseModel):
    """Contract serialised by the `/health` endpoint."""

    status: Literal["ok", "error"] = Field(description="Overall service readiness indicator.")
    timestamp: datetime = Field(description="UTC timestamp generated at response time.")
    version: str | None = Field(
        default=None,
        description="Semantic version or git SHA describing the running service build.",
    )
    details: dict[str, Any] | None = Field(
        default=None,
        description="Optional diagnostic payload when the service is unhealthy.",
    )

    model_config = ConfigDict(
        json_encoders={datetime: lambda value: value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")},
    )


def build_health_status(version: str | None = None) -> HealthStatus:
    """Helper constructing a healthy response with the provided version."""

    return HealthStatus(status="ok", version=version, timestamp=datetime.now(timezone.utc))


__all__ = ["HealthStatus", "build_health_status"]
