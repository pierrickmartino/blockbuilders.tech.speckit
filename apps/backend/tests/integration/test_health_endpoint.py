from __future__ import annotations

from datetime import datetime
from http import HTTPStatus
from time import perf_counter

from app.factory import create_app

import pytest
from fastapi.testclient import TestClient


def test_health_endpoint_returns_contract_compliant_payload(
    record_property: pytest.RecordProperty,
) -> None:
    app = create_app()
    client = TestClient(app)

    started_at = perf_counter()
    response = client.get("/health")
    elapsed_ms = round((perf_counter() - started_at) * 1000, 2)
    record_property("health_latency_ms", elapsed_ms)

    assert response.status_code == HTTPStatus.OK

    payload = response.json()

    assert payload["status"] == "ok"
    assert isinstance(payload["version"], str)
    assert payload["version"].strip()
    # Confirm timestamp is RFC 3339 / ISO-8601 serialised.
    datetime.fromisoformat(payload["timestamp"].replace("Z", "+00:00"))
    assert payload.get("details") is None
