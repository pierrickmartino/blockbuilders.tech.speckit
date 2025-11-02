from __future__ import annotations

import asyncio
import json
import time
from pathlib import Path
from typing import AsyncIterator

import httpx
import pytest
from httpx import ASGITransport
from jose import jwt
from jose.utils import base64url_encode

from app.core.settings import get_settings
from app.factory import create_app

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


@pytest.fixture
def configure_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key")
    monkeypatch.setenv("SUPABASE_JWT_AUDIENCE", "authenticated")
    monkeypatch.setenv("SUPABASE_JWT_ISSUER", "https://example.supabase.co/auth/v1")
    monkeypatch.setenv("SUPABASE_JWT_CACHE_TTL", "60")
    monkeypatch.setenv("SUPABASE_JWKS_URL", "https://example.supabase.co/auth/v1/jwks")

    get_settings.cache_clear()  # type: ignore[attr-defined]


@pytest.fixture
async def app_client(configure_settings: None) -> AsyncIterator[httpx.AsyncClient]:
    app = create_app()

    class _StaticJWKSCache:
        async def get_jwks(self) -> dict[str, object]:
            return TEST_JWKS_RESPONSE.copy()

    jwks_cache = _StaticJWKSCache()

    from app.dependencies.supabase import get_jwks_cache

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

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "3b8b6480-9902-4a34-9dfd-64d3faefbe0e"
    assert payload["email"] == "user@example.com"
    assert payload["email_confirmed_at"] == "2025-01-01T00:00:00Z"


@pytest.mark.asyncio
async def test_me_endpoint_requires_authorization_header(app_client: httpx.AsyncClient) -> None:
    response = await app_client.get("/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "authentication required"


@pytest.mark.asyncio
async def test_me_endpoint_enforces_csrf_header(app_client: httpx.AsyncClient) -> None:
    token = build_token()
    response = await app_client.get(
        "/me",
        headers=build_auth_headers(token, csrf_token=None),
        cookies=build_auth_cookies(),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "csrf token missing or invalid"


@pytest.mark.asyncio
async def test_me_endpoint_rejects_unconfirmed_email(app_client: httpx.AsyncClient) -> None:
    token = build_token(email_confirmed=False)
    response = await app_client.get(
        "/me",
        headers=build_auth_headers(token),
        cookies=build_auth_cookies(),
    )

    assert response.status_code == 401
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

    assert p95 < 0.2, "p95 latency must remain under 200ms"
