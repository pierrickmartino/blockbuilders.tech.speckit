from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

from app.api.lineage import get_lineage_service
from app.api.status import get_status_service
from app.factory import create_app
from app.schemas.ohlcv import (
    Interval,
    IssueType,
    LineageEntry,
    RemediationEntry,
    StatusState,
    VendorState,
)
from app.services.lineage_service import LineageServiceProtocol
from app.services.status_service import StatusServiceProtocol

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport


class _FakeStatusService(StatusServiceProtocol):
    async def get_summary(self, *, only_stale: bool = False):
        now = datetime.now(UTC)
        return [
            {
                "asset": "BTC",
                "interval": Interval.DAY,
                "coverage_start": now - timedelta(days=10),
                "coverage_end": now,
                "latest_timestamp": now,
                "freshness_minutes": 30.5,
                "status": StatusState.HEALTHY,
                "vendor_status": VendorState.UP,
            }
        ]

    async def get_remediation_entries(
        self,
        *,
        asset: str | None = None,
        issue_type: IssueType | None = None,
    ) -> list[RemediationEntry]:
        now = datetime.now(UTC)
        return [
            RemediationEntry(
                id="ffffffff-1111-2222-3333-444444444444",
                asset_symbol="BTC",
                interval=Interval.DAY,
                range_start=now - timedelta(days=2),
                range_end=now - timedelta(days=1),
                issue_type=IssueType.GAP,
                detected_at=now - timedelta(hours=1),
                notes="external ref only",
                resolved=False,
                run_id=None,
                resolved_at=None,
            )
        ]


class _FakeLineageService(LineageServiceProtocol):
    async def query_lineage(self, *, asset: str, start: datetime, end: datetime, interval: Interval) -> list[LineageEntry]:
        return [
            LineageEntry(
                id="eeeeeeee-ffff-0000-1111-222222222222",
                asset_symbol=asset,
                bucket_start=start,
                interval=interval,
                run_id="dddddddd-aaaa-bbbb-cccc-999999999999",
                source_vendor="primary",
                fetched_at=start + timedelta(minutes=1),
                checksum_sha256="zzz",
            )
        ]


@pytest_asyncio.fixture()
async def sanitized_client() -> AsyncIterator[httpx.AsyncClient]:
    app = create_app()
    app.dependency_overrides[get_status_service] = lambda: _FakeStatusService()
    app.dependency_overrides[get_lineage_service] = lambda: _FakeLineageService()

    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        yield client


def _assert_no_internal_fields(payload: dict) -> None:
    serialized = str(payload).lower()
    forbidden_tokens = ("password", "secret", "connection", "dsn", "internal", "host=")
    assert not any(token in serialized for token in forbidden_tokens)


@pytest.mark.asyncio
async def test_status_payloads_do_not_leak_internal_fields(sanitized_client: httpx.AsyncClient) -> None:
    summary = await sanitized_client.get("/status/summary")
    payload = summary.json()
    _assert_no_internal_fields(payload)
    assert all(set(item.keys()) <= {
        "asset",
        "interval",
        "coverage_start",
        "coverage_end",
        "latest_timestamp",
        "freshness_minutes",
        "status",
        "vendor_status",
    } for item in payload["assets"])

    remediation = await sanitized_client.get("/status/remediation")
    remediation_payload = remediation.json()
    _assert_no_internal_fields(remediation_payload)
    assert all(set(item.keys()) <= {
        "id",
        "asset_symbol",
        "interval",
        "range_start",
        "range_end",
        "issue_type",
        "detected_at",
        "resolved",
        "resolved_at",
        "run_id",
        "notes",
    } for item in remediation_payload["items"])

    lineage = await sanitized_client.get(
        "/lineage",
        params={
            "asset": "BTC",
            "start": "2025-11-22T00:00:00Z",
            "end": "2025-11-22T01:00:00Z",
            "interval": Interval.MINUTE.value,
        },
    )
    lineage_payload = lineage.json()
    _assert_no_internal_fields(lineage_payload)
    assert all(set(item.keys()) <= {
        "id",
        "asset_symbol",
        "bucket_start",
        "interval",
        "run_id",
        "source_vendor",
        "fetched_at",
        "checksum_sha256",
        "checksum_version",
    } for item in lineage_payload["items"])
