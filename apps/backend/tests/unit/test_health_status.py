from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.schemas.health import HealthStatus


def test_health_status_ok_serialisation_excludes_null_details() -> None:
    timestamp = datetime(2025, 1, 1, 12, 30, tzinfo=timezone.utc)

    status = HealthStatus(status="ok", version="0.1.0-dev", timestamp=timestamp)

    assert status.model_dump(exclude_none=True, mode="json") == {
        "status": "ok",
        "version": "0.1.0-dev",
        "timestamp": timestamp.isoformat().replace("+00:00", "Z"),
    }


def test_health_status_error_serialisation_includes_details() -> None:
    timestamp = datetime(2025, 1, 1, 12, 30, tzinfo=timezone.utc)

    status = HealthStatus(
        status="error",
        timestamp=timestamp,
        details={"message": "Environment validation failed", "checks": []},
    )

    payload = status.model_dump(exclude_none=True, mode="json")

    assert payload["status"] == "error"
    assert payload["timestamp"].endswith("Z")
    assert payload["details"]["message"] == "Environment validation failed"
    assert isinstance(payload["details"]["checks"], list)

    with pytest.raises(ValueError):
        HealthStatus(status="invalid", timestamp=timestamp)
