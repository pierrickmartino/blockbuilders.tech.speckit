from __future__ import annotations

from collections.abc import AsyncIterator
from http import HTTPStatus

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport

from app.api.alerts import get_alerts_service
from app.factory import create_app


class FakeAlertsCoordinator:
    def __init__(self) -> None:
        self.called = False

    async def send_test_alert(self) -> None:
        self.called = True

    async def evaluate(self):  # pragma: no cover - not used here
        return []


@pytest_asyncio.fixture()
async def alerts_client() -> AsyncIterator[tuple[httpx.AsyncClient, FakeAlertsCoordinator]]:
    app = create_app()
    fake = FakeAlertsCoordinator()
    app.dependency_overrides[get_alerts_service] = lambda: fake

    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client, fake


@pytest.mark.asyncio
async def test_alerts_test_endpoint_dispatches(alerts_client) -> None:
    client, fake = alerts_client

    response = await client.post("/alerts/test")

    assert response.status_code == HTTPStatus.NO_CONTENT
    assert fake.called is True
