from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from uuid import uuid4

from app.api.lineage import get_lineage_service
from app.schemas.ohlcv import Interval, LineageEntry
from app.services.lineage_service import LineageServiceProtocol

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport

from app.factory import create_app


class FakeLineageService(LineageServiceProtocol):
    def __init__(self) -> None:
        now = datetime.now(timezone.utc)
        self._entries: list[LineageEntry] = [
            LineageEntry(
                id=uuid4(),
                asset_symbol="BTC",
                bucket_start=now - timedelta(minutes=2),
                interval=Interval.MINUTE,
                run_id=uuid4(),
                source_vendor="primary",
                fetched_at=now - timedelta(minutes=1),
                checksum_sha256="abc123",
            ),
            LineageEntry(
                id=uuid4(),
                asset_symbol="BTC",
                bucket_start=now - timedelta(minutes=1),
                interval=Interval.MINUTE,
                run_id=uuid4(),
                source_vendor="primary",
                fetched_at=now,
                checksum_sha256="def456",
            ),
        ]

    async def query_lineage(
        self,
        *,
        asset: str,
        start: datetime,
        end: datetime,
        interval: Interval,
    ) -> list[LineageEntry]:
        return [entry for entry in self._entries if start <= entry.bucket_start < end]


@pytest_asyncio.fixture()
async def lineage_client() -> AsyncIterator[httpx.AsyncClient]:
    app = create_app()
    app.dependency_overrides[get_lineage_service] = lambda: FakeLineageService()

    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client


@pytest.mark.asyncio
async def test_lineage_returns_entries_within_range(lineage_client: httpx.AsyncClient) -> None:
    now = datetime.now(timezone.utc)
    response = await lineage_client.get(
        "/lineage",
        params={
            "asset": "BTC",
            "start": (now - timedelta(minutes=3)).isoformat(),
            "end": now.isoformat(),
            "interval": Interval.MINUTE.value,
        },
    )
    assert response.status_code == HTTPStatus.OK
    payload = response.json()
    assert "items" in payload
    assert len(payload["items"]) == 2
    assert all(item["asset_symbol"] == "BTC" for item in payload["items"])


@pytest.mark.asyncio
async def test_lineage_rejects_invalid_range(lineage_client: httpx.AsyncClient) -> None:
    now = datetime.now(timezone.utc)
    response = await lineage_client.get(
        "/lineage",
        params={
            "asset": "BTC",
            "start": now.isoformat(),
            "end": (now - timedelta(minutes=1)).isoformat(),
            "interval": Interval.MINUTE.value,
        },
    )
    assert response.status_code == HTTPStatus.BAD_REQUEST
