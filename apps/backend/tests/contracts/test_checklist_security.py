from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from http import HTTPStatus
from uuid import UUID

from app.core.settings import Settings
from app.factory import create_app

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport

USER_ID = UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
WORKSPACE_ID = UUID("bbbbbbbb-cccc-dddd-eeee-ffffffffffff")

OVERRIDE_PAYLOAD = {
    "userId": str(USER_ID),
    "workspaceId": str(WORKSPACE_ID),
    "reason": "Support override required",
    "actorId": str(USER_ID),
    "actorRole": "teammate",
}

TELEMETRY_PAYLOAD = {
    "eventType": "viewed",
    "stepId": "disclosures",
    "metadata": {"source": "playwright"},
}


def _build_test_settings() -> Settings:
    return Settings(
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="service-role-key",
        supabase_jwt_audience="authenticated",
        supabase_jwt_issuer="https://example.supabase.co/auth/v1",
        supabase_jwks_url="https://example.supabase.co/auth/v1/keys",
    )


@pytest_asyncio.fixture()
async def unauthorized_client() -> AsyncIterator[httpx.AsyncClient]:
    app = create_app(settings=_build_test_settings())

    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client


@pytest.mark.asyncio
async def test_checklist_requires_authentication(unauthorized_client: httpx.AsyncClient) -> None:
    response = await unauthorized_client.get("/onboarding/checklist")
    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_override_requires_authentication(unauthorized_client: httpx.AsyncClient) -> None:
    response = await unauthorized_client.post("/onboarding/overrides/mark-as-done", json=OVERRIDE_PAYLOAD)
    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_telemetry_requires_authentication(unauthorized_client: httpx.AsyncClient) -> None:
    response = await unauthorized_client.post("/onboarding/events", json=TELEMETRY_PAYLOAD)
    assert response.status_code == HTTPStatus.UNAUTHORIZED


@pytest.mark.asyncio
async def test_csrf_header_required_when_session_cookie_present(
    unauthorized_client: httpx.AsyncClient,
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO)
    response = await unauthorized_client.post(
        "/onboarding/events",
        json=TELEMETRY_PAYLOAD,
        headers={"Authorization": "Bearer dummy-token"},
        cookies={
            "sb-access-token": "session-token",
            "sb-csrf-token": "expected-token",
        },
    )

    assert response.status_code == HTTPStatus.FORBIDDEN
    auth_logs = [record for record in caplog.records if record.name == "app.auth.supabase"]
    telemetry_logs = [record for record in caplog.records if record.name == "app.telemetry.forwarder"]

    assert any("Supabase JWT verification failed" in record.message for record in auth_logs)
    assert telemetry_logs == []
