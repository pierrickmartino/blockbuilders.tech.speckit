from __future__ import annotations

from datetime import datetime

from fastapi.testclient import TestClient

from app.factory import create_app


def test_health_endpoint_returns_contract_compliant_payload() -> None:
    app = create_app()
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200

    payload = response.json()

    assert payload["status"] == "ok"
    assert isinstance(payload["version"], str)
    assert payload["version"].strip()
    # Confirm timestamp is RFC 3339 / ISO-8601 serialised.
    datetime.fromisoformat(payload["timestamp"].replace("Z", "+00:00"))
    assert payload.get("details") is None
