from __future__ import annotations

from collections.abc import AsyncIterator
from http import HTTPStatus

from app.api.ingestion import get_ingestion_service, router as ingestion_router
from app.schemas.ohlcv import Interval
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
from tests.fixtures.ohlcv_seed import EXPECTED_CHECKSUMS, EXPECTED_ROW_COUNTS, SEED_CANDLES


@pytest_asyncio.fixture()
async def ingestion_client() -> AsyncIterator[httpx.AsyncClient]:
    """Spin up a FastAPI test app using the ingestion router with in-memory deps."""

    repo = InMemoryIngestionRepository()
    service = IngestionService(
        repository=repo,
        checksum=ChecksumHelper(),
        data_provider=StaticDatasetProvider(SEED_CANDLES),
    )

    app = FastAPI()
    app.dependency_overrides[get_ingestion_service] = lambda: service
    app.include_router(ingestion_router)

    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client


@pytest.mark.asyncio
async def test_backfill_returns_checksum_and_rowcount(ingestion_client: httpx.AsyncClient) -> None:
    response = await ingestion_client.post(
        "/ingestion/backfill",
        json={"interval": Interval.DAY.value},
    )

    assert response.status_code == HTTPStatus.ACCEPTED
    payload = response.json()

    run_id = payload["id"]
    assert payload["interval"] == Interval.DAY.value
    assert payload["status"] == "success"
    assert payload["row_count"] == EXPECTED_ROW_COUNTS[Interval.DAY]
    assert payload["checksum_sha256"] == EXPECTED_CHECKSUMS[Interval.DAY]

    follow_up = await ingestion_client.get(f"/ingestion/runs/{run_id}")
    assert follow_up.status_code == HTTPStatus.OK
    follow_payload = follow_up.json()

    assert follow_payload["id"] == run_id
    assert follow_payload["checksum_sha256"] == EXPECTED_CHECKSUMS[Interval.DAY]
    assert follow_payload["row_count"] == EXPECTED_ROW_COUNTS[Interval.DAY]


@pytest.mark.asyncio
async def test_backfill_respects_interval_query(ingestion_client: httpx.AsyncClient) -> None:
    response = await ingestion_client.post(
        "/ingestion/backfill",
        json={"interval": Interval.MINUTE.value},
    )

    assert response.status_code == HTTPStatus.ACCEPTED
    payload = response.json()
    assert payload["interval"] == Interval.MINUTE.value
    assert payload["row_count"] == EXPECTED_ROW_COUNTS[Interval.MINUTE]
