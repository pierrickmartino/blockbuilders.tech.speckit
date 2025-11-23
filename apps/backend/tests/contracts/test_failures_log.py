from __future__ import annotations

from datetime import UTC, datetime, timedelta
from http import HTTPStatus

from app.api.ingestion import get_ingestion_service, router as ingestion_router
from app.schemas.ohlcv import IngestionStatus, Interval
from app.services.checksum import ChecksumHelper
from app.services.ingestion import (
    IngestionService,
    InMemoryIngestionRepository,
    StaticDatasetProvider,
)

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport
from tests.fixtures.ohlcv_seed import SEED_CANDLES


@pytest_asyncio.fixture()
async def ingestion_client() -> httpx.AsyncClient:
    """Spin up FastAPI test app with ingestion router and in-memory deps."""

    repo = InMemoryIngestionRepository()
    service = IngestionService(
        repository=repo,
        checksum=ChecksumHelper(),
        data_provider=StaticDatasetProvider(SEED_CANDLES),
    )

    now = datetime.now(UTC)
    repo.add_run(
        asset_symbol="BTC",
        interval=Interval.DAY,
        status=IngestionStatus.FAILED,
        started_at=now - timedelta(days=5),
        ended_at=now - timedelta(days=5, minutes=1),
        error_summary="timeout",
    )
    repo.add_run(
        asset_symbol="ETH",
        interval=Interval.MINUTE,
        status=IngestionStatus.FAILED,
        started_at=now - timedelta(days=40),
        ended_at=now - timedelta(days=40, minutes=1),
        error_summary="vendor 503",
    )

    app = FastAPI()
    app.dependency_overrides[get_ingestion_service] = lambda: service
    app.include_router(ingestion_router)

    client = httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver")
    try:
        yield client
    finally:
        await client.aclose()


@pytest.mark.asyncio
async def test_failure_log_filters_lookback(ingestion_client: httpx.AsyncClient) -> None:
    response = await ingestion_client.get("/ingestion/failures", params={"window_days": 30})

    assert response.status_code == HTTPStatus.OK
    payload = response.json()

    assert len(payload) == 1
    item = payload[0]
    assert item["asset_symbol"] == "BTC"
    assert item["status"] == IngestionStatus.FAILED.value
    assert item["error_summary"] == "timeout"


@pytest.mark.asyncio
async def test_failure_log_limits_window_range(ingestion_client: httpx.AsyncClient) -> None:
    response = await ingestion_client.get("/ingestion/failures", params={"window_days": 10})
    assert response.status_code == HTTPStatus.OK
    assert len(response.json()) == 1

    response = await ingestion_client.get("/ingestion/failures", params={"window_days": 1})
    assert response.status_code == HTTPStatus.OK
    assert len(response.json()) == 0
