from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone
from http import HTTPStatus

from app.api.status import get_status_service
from app.schemas.ohlcv import Interval, IssueType, RemediationEntry
from app.services.status_service import StatusServiceProtocol

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport

from app.factory import create_app


class FakeStatusService(StatusServiceProtocol):
    def __init__(self) -> None:
        now = datetime.now(timezone.utc)
        self._entries: list[RemediationEntry] = [
            RemediationEntry(
                id="11111111-2222-3333-4444-555555555555",
                asset_symbol="BTC",
                interval=Interval.DAY,
                range_start=now - timedelta(days=2),
                range_end=now - timedelta(days=1),
                issue_type=IssueType.GAP,
                detected_at=now - timedelta(hours=2),
                resolved=False,
            ),
            RemediationEntry(
                id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                asset_symbol="ETH",
                interval=Interval.MINUTE,
                range_start=now - timedelta(hours=6),
                range_end=now - timedelta(hours=4),
                issue_type=IssueType.CHECKSUM_MISMATCH,
                detected_at=now - timedelta(hours=1),
                resolved=True,
                resolved_at=now - timedelta(minutes=30),
            ),
        ]

    async def get_summary(self, *, only_stale: bool = False):  # pragma: no cover - not used in this test
        return []

    async def get_remediation_entries(
        self,
        *,
        asset: str | None = None,
        issue_type: IssueType | None = None,
    ) -> list[RemediationEntry]:
        entries = self._entries
        if asset:
            entries = [item for item in entries if item.asset_symbol == asset]
        if issue_type:
            entries = [item for item in entries if item.issue_type == issue_type]
        return entries


@pytest_asyncio.fixture()
async def remediation_client() -> AsyncIterator[httpx.AsyncClient]:
    app = create_app()
    app.dependency_overrides[get_status_service] = lambda: FakeStatusService()

    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client


@pytest.mark.asyncio
async def test_remediation_returns_all(remediation_client: httpx.AsyncClient) -> None:
    response = await remediation_client.get("/status/remediation")
    assert response.status_code == HTTPStatus.OK
    payload = response.json()
    assert len(payload["items"]) == 2
    assert {item["asset_symbol"] for item in payload["items"]} == {"BTC", "ETH"}


@pytest.mark.asyncio
async def test_remediation_filters_by_asset_and_issue(remediation_client: httpx.AsyncClient) -> None:
    response = await remediation_client.get(
        "/status/remediation",
        params={"asset": "ETH", "issue_type": IssueType.CHECKSUM_MISMATCH.value},
    )
    assert response.status_code == HTTPStatus.OK
    payload = response.json()
    assert len(payload["items"]) == 1
    item = payload["items"][0]
    assert item["asset_symbol"] == "ETH"
    assert item["issue_type"] == IssueType.CHECKSUM_MISMATCH.value


@pytest.mark.asyncio
async def test_remediation_rejects_blank_asset(remediation_client: httpx.AsyncClient) -> None:
    response = await remediation_client.get("/status/remediation", params={"asset": "  "})
    assert response.status_code == HTTPStatus.BAD_REQUEST
