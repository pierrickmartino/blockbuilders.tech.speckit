from __future__ import annotations

import asyncio
import json
import time
from collections.abc import AsyncIterator
from http import HTTPStatus
from pathlib import Path

from app.core.settings import get_settings
from app.dependencies import supabase as supabase_deps
from app.dependencies.supabase import get_jwks_cache, get_jwt_verifier
from app.factory import create_app
from app.services.supabase import SupabaseJWTVerificationError

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport
from jose import jwt
from jose.utils import base64url_encode

TEST_SECRET = b"super-secret-signing-key"
TEST_JWKS_RESPONSE = {
    "keys": [
        {
            "kty": "oct",
            "kid": "integration-key",
            "alg": "HS256",
            "k": base64url_encode(TEST_SECRET).decode(),
            "use": "sig",
        }
    ]
}

MAX_P95_LATENCY_SECONDS = 0.2


@pytest.fixture
def configure_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key")
    monkeypatch.setenv("SUPABASE_JWT_AUDIENCE", "authenticated")
    monkeypatch.setenv("SUPABASE_JWT_ISSUER", "https://example.supabase.co/auth/v1")
    monkeypatch.setenv("SUPABASE_JWT_CACHE_TTL", "60")
    monkeypatch.setenv("SUPABASE_JWKS_URL", "https://example.supabase.co/auth/v1/jwks")

    get_settings.cache_clear()  # type: ignore[attr-defined]


@pytest_asyncio.fixture
async def app_client(configure_settings: None) -> AsyncIterator[httpx.AsyncClient]:
    app = create_app()

    class _StaticJWKSCache:
        async def get_jwks(self) -> dict[str, object]:
            return TEST_JWKS_RESPONSE.copy()

    jwks_cache = _StaticJWKSCache()

    app.dependency_overrides[get_jwks_cache] = lambda: jwks_cache

    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
        follow_redirects=True,
    ) as client:
        yield client


def build_token(email_confirmed: bool = True) -> str:
    claims = {
        "sub": "3b8b6480-9902-4a34-9dfd-64d3faefbe0e",
        "aud": "authenticated",
        "iss": "https://example.supabase.co/auth/v1",
        "email": "user@example.com",
        "email_confirmed_at": "2025-01-01T00:00:00Z" if email_confirmed else None,
    }
    return jwt.encode(
        claims=claims,
        key=TEST_SECRET,
        algorithm="HS256",
        headers={"kid": "integration-key"},
    )


def build_auth_headers(token: str, csrf_token: str | None = "csrf-token") -> dict[str, str]:
    headers = {"Authorization": f"Bearer {token}"}
    if csrf_token is not None:
        headers["x-csrf-token"] = csrf_token
    return headers


def build_auth_cookies(csrf_token: str | None = "csrf-token") -> dict[str, str]:
    cookies = {"sb-access-token": "access-cookie"}
    if csrf_token is not None:
        cookies["sb-csrf-token"] = csrf_token
    return cookies


@pytest.mark.asyncio
async def test_me_endpoint_returns_profile_payload(app_client: httpx.AsyncClient) -> None:
    token = build_token()
    response = await app_client.get(
        "/me",
        headers=build_auth_headers(token),
        cookies=build_auth_cookies(),
    )

    assert response.status_code == HTTPStatus.OK
    payload = response.json()
    assert payload["id"] == "3b8b6480-9902-4a34-9dfd-64d3faefbe0e"
    assert payload["email"] == "user@example.com"
    assert payload["email_confirmed_at"] == "2025-01-01T00:00:00Z"


@pytest.mark.asyncio
async def test_me_endpoint_requires_authorization_header(app_client: httpx.AsyncClient) -> None:
    response = await app_client.get("/me")
    assert response.status_code == HTTPStatus.UNAUTHORIZED
    assert response.json()["detail"] == "authentication required"


@pytest.mark.asyncio
async def test_me_endpoint_enforces_csrf_header(app_client: httpx.AsyncClient) -> None:
    token = build_token()
    response = await app_client.get(
        "/me",
        headers=build_auth_headers(token, csrf_token=None),
        cookies=build_auth_cookies(),
    )

    assert response.status_code == HTTPStatus.FORBIDDEN
    assert response.json()["detail"] == "csrf token missing or invalid"


@pytest.mark.asyncio
async def test_me_endpoint_rejects_unconfirmed_email(app_client: httpx.AsyncClient) -> None:
    token = build_token(email_confirmed=False)
    response = await app_client.get(
        "/me",
        headers=build_auth_headers(token),
        cookies=build_auth_cookies(),
    )

    assert response.status_code == HTTPStatus.UNAUTHORIZED
    assert response.json()["detail"] == "authentication required"


@pytest.mark.asyncio
async def test_me_endpoint_latency_under_budget(app_client: httpx.AsyncClient) -> None:
    token = build_token()
    durations: list[float] = []

    for _ in range(10):
        start = time.perf_counter()
        response = await app_client.get(
            "/me",
            headers=build_auth_headers(token),
            cookies=build_auth_cookies(),
        )
        response.raise_for_status()
        durations.append(time.perf_counter() - start)
        await asyncio.sleep(0.01)

    durations.sort()
    index = max(int(len(durations) * 0.95) - 1, 0)
    p95 = durations[index]

    artifacts_dir = Path("artifacts")
    artifacts_dir.mkdir(exist_ok=True)
    metrics_path = artifacts_dir / "backend_me_latency.json"
    metrics_path.write_text(json.dumps({"samples": durations, "p95": p95}), encoding="utf-8")

    assert p95 < MAX_P95_LATENCY_SECONDS, "p95 latency must remain under 200ms"


@pytest.mark.asyncio
async def test_me_endpoint_falls_back_to_supabase_user_lookup(
    app_client: httpx.AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app = app_client._transport.app  # type: ignore[attr-defined]

    class _FailingVerifier:
        async def verify(self, token: str) -> dict[str, object]:
            raise SupabaseJWTVerificationError("jwks unavailable")

    async def _fake_fetch_claims(settings: object, token: str) -> dict[str, object]:
        return {
            "sub": "d8ddcc58-d0fe-43e8-9e53-5c5db5589551",
            "email": "fallback@example.com",
            "email_confirmed_at": "2025-01-01T00:00:00Z",
            "last_sign_in_at": "2025-01-01T00:00:00Z",
            "user_metadata": {"workspace_id": "00000000-0000-0000-0000-000000000000"},
            "app_metadata": {},
        }

    monkeypatch.setattr(
        supabase_deps,
        "_fetch_claims_via_supabase_user_endpoint",
        _fake_fetch_claims,
    )
    app.dependency_overrides[get_jwt_verifier] = lambda: _FailingVerifier()

    token = build_token()
    response = await app_client.get(
        "/me",
        headers=build_auth_headers(token),
        cookies=build_auth_cookies(),
    )

    assert response.status_code == HTTPStatus.OK
    assert response.json()["email"] == "fallback@example.com"

    app.dependency_overrides.pop(get_jwt_verifier, None)
