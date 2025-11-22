from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone
from http import HTTPStatus

from app.api.status import get_status_service
from app.schemas.ohlcv import Interval, IssueType, RemediationEntry, StatusState, VendorState
from app.services.status_service import StatusServiceProtocol

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport

from app.factory import create_app


class FakeStatusService(StatusServiceProtocol):
    def __init__(self) -> None:
        now = datetime.now(timezone.utc)
        self._summary = [
            {
                "asset": "BTC",
                "interval": Interval.MINUTE,
                "coverage_start": now - timedelta(days=10),
                "coverage_end": now,
                "latest_timestamp": now,
                "freshness_minutes": 5.0,
                "status": StatusState.HEALTHY,
                "vendor_status": VendorState.UP,
            },
            {
                "asset": "ETH",
                "interval": Interval.MINUTE,
                "coverage_start": now - timedelta(days=2),
                "coverage_end": now - timedelta(hours=3),
                "latest_timestamp": now - timedelta(hours=3),
                "freshness_minutes": 180.0,
                "status": StatusState.STALE,
                "vendor_status": VendorState.DEGRADED,
            },
        ]
        self._remediations: list[RemediationEntry] = [
            RemediationEntry(
                id="11111111-2222-3333-4444-555555555555",
                asset_symbol="BTC",
                interval=Interval.DAY,
                range_start=now - timedelta(days=2),
                range_end=now - timedelta(days=1),
                issue_type=IssueType.GAP,
                detected_at=now - timedelta(hours=2),
                resolved=False,
                notes="backfill queued",
                run_id=None,
                resolved_at=None,
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
                notes="corrected",
                run_id=None,
                resolved_at=now - timedelta(minutes=30),
            ),
        ]

    async def get_summary(self, *, only_stale: bool = False):
        assets = self._summary
        if only_stale:
            assets = [row for row in assets if row["status"] != StatusState.HEALTHY]
        return assets

    async def get_remediation_entries(
        self,
        *,
        asset: str | None = None,
        issue_type: IssueType | None = None,
    ) -> list[RemediationEntry]:
        results = self._remediations
        if asset:
            results = [entry for entry in results if entry.asset_symbol == asset]
        if issue_type:
            results = [entry for entry in results if entry.issue_type == issue_type]
        return results


@pytest_asyncio.fixture()
async def status_client() -> AsyncIterator[httpx.AsyncClient]:
    app = create_app()
    app.dependency_overrides[get_status_service] = lambda: FakeStatusService()

    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client


@pytest.mark.asyncio
async def test_status_summary_returns_assets_and_filters_stale(status_client: httpx.AsyncClient) -> None:
    response = await status_client.get("/status/summary")
    assert response.status_code == HTTPStatus.OK

    payload = response.json()
    assert "assets" in payload
    assets = payload["assets"]
    assert len(assets) == 2

    btc = next(item for item in assets if item["asset"] == "BTC")
    assert btc["interval"] == Interval.MINUTE.value
    assert btc["status"] == StatusState.HEALTHY.value
    assert btc["vendor_status"] == VendorState.UP.value
    assert btc["freshness_minutes"] <= 10

    stale_response = await status_client.get("/status/summary", params={"only_stale": "true"})
    stale_payload = stale_response.json()
    assert len(stale_payload["assets"]) == 1
    assert stale_payload["assets"][0]["status"] == StatusState.STALE.value
    assert stale_payload["assets"][0]["asset"] == "ETH"


@pytest.mark.asyncio
async def test_remediation_filters_by_asset_and_issue(status_client: httpx.AsyncClient) -> None:
    response = await status_client.get("/status/remediation")
    assert response.status_code == HTTPStatus.OK
    items = response.json()["items"]
    assert len(items) == 2
    assert {item["issue_type"] for item in items} == {IssueType.GAP.value, IssueType.CHECKSUM_MISMATCH.value}

    filtered = await status_client.get(
        "/status/remediation",
        params={"asset": "ETH", "issue_type": IssueType.CHECKSUM_MISMATCH.value},
    )
    assert filtered.status_code == HTTPStatus.OK
    filtered_items = filtered.json()["items"]
    assert len(filtered_items) == 1
    entry = filtered_items[0]
    assert entry["asset_symbol"] == "ETH"
    assert entry["issue_type"] == IssueType.CHECKSUM_MISMATCH.value


@pytest.mark.asyncio
async def test_status_remediation_rejects_blank_asset(status_client: httpx.AsyncClient) -> None:
    response = await status_client.get("/status/remediation", params={"asset": "  "})
    assert response.status_code == HTTPStatus.BAD_REQUEST
