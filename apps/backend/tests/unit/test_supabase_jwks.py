from __future__ import annotations

import asyncio
from collections.abc import Callable

from app.services.supabase.jwks_cache import JWKSCache, JWKSFetchError
from app.services.supabase.jwt_verifier import (
    SupabaseJWTVerificationError,
    SupabaseJWTVerifier,
)

import httpx
import pytest
from jose import jwt
from jose.utils import base64url_encode

TEST_JWKS_URL = "https://example.supabase.co/auth/v1/jwks"
TEST_AUDIENCE = "authenticated"
TEST_ISSUER = "https://example.supabase.co/auth/v1"
TEST_SECRET = b"super-secret-signing-key"
TEST_JWKS_RESPONSE = {
    "keys": [
        {
            "kty": "oct",
            "kid": "test-key",
            "alg": "HS256",
            "k": base64url_encode(TEST_SECRET).decode(),
            "use": "sig",
        }
    ]
}

MIN_REFRESH_CALLS = 2


def build_mock_transport(
    handler: Callable[[httpx.Request], httpx.Response],
) -> httpx.AsyncClient:
    """Return an async client configured with the provided handler."""

    transport = httpx.MockTransport(handler)
    return httpx.AsyncClient(transport=transport)


@pytest.mark.asyncio
async def test_jwks_cache_fetches_and_caches_keys() -> None:
    call_count = 0

    async def _handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return httpx.Response(200, json=TEST_JWKS_RESPONSE)

    async with build_mock_transport(_handler) as client:
        cache = JWKSCache(url=TEST_JWKS_URL, ttl_seconds=60, client=client)

        first = await cache.get_jwks()
        second = await cache.get_jwks()

        assert first == TEST_JWKS_RESPONSE
        assert second == TEST_JWKS_RESPONSE
        assert call_count == 1, "JWKS should be cached for the TTL window"


@pytest.mark.asyncio
async def test_jwks_cache_refreshes_after_ttl_expiry() -> None:
    call_count = 0

    async def _handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        payload = {
            "keys": [
                {
                    "kid": f"test-key-{call_count}",
                    "kty": "oct",
                    "alg": "HS256",
                    "k": base64url_encode(TEST_SECRET).decode(),
                    "use": "sig",
                }
            ]
        }
        return httpx.Response(200, json=payload)

    async with build_mock_transport(_handler) as client:
        cache = JWKSCache(url=TEST_JWKS_URL, ttl_seconds=0.05, client=client)

        first = await cache.get_jwks()
        await asyncio.sleep(0.06)
        second = await cache.get_jwks()

        assert first is not second
        assert first["keys"][0]["kid"] != second["keys"][0]["kid"]
        assert call_count >= MIN_REFRESH_CALLS, "Cache should refresh after TTL expires"


@pytest.mark.asyncio
async def test_jwks_cache_raises_on_fetch_failure() -> None:
    async def _handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"error": "upstream failure"})

    async with build_mock_transport(_handler) as client:
        cache = JWKSCache(url=TEST_JWKS_URL, ttl_seconds=60, client=client)

        with pytest.raises(JWKSFetchError):
            await cache.get_jwks()


@pytest.mark.asyncio
async def test_jwt_verifier_rejects_invalid_signature() -> None:
    async def _handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=TEST_JWKS_RESPONSE)

    async with build_mock_transport(_handler) as client:
        cache = JWKSCache(url=TEST_JWKS_URL, ttl_seconds=60, client=client)
        verifier = SupabaseJWTVerifier(
            jwks_cache=cache,
            audience=TEST_AUDIENCE,
            issuer=TEST_ISSUER,
        )

        token = jwt.encode(
            claims={"sub": "1", "aud": TEST_AUDIENCE, "iss": TEST_ISSUER, "email": "user@example.com"},
            key=b"other-secret",
            algorithm="HS256",
            headers={"kid": "test-key"},
        )

        with pytest.raises(SupabaseJWTVerificationError):
            await verifier.verify(token)


@pytest.mark.asyncio
async def test_jwt_verifier_rejects_when_email_not_confirmed() -> None:
    async def _handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=TEST_JWKS_RESPONSE)

    async with build_mock_transport(_handler) as client:
        cache = JWKSCache(url=TEST_JWKS_URL, ttl_seconds=60, client=client)
        verifier = SupabaseJWTVerifier(jwks_cache=cache, audience=TEST_AUDIENCE, issuer=TEST_ISSUER)

        token = jwt.encode(
            claims={
                "sub": "1",
                "aud": TEST_AUDIENCE,
                "iss": TEST_ISSUER,
                "email": "user@example.com",
                "email_confirmed_at": None,
            },
            key=TEST_SECRET,
            algorithm="HS256",
            headers={"kid": "test-key"},
        )

        with pytest.raises(SupabaseJWTVerificationError):
            await verifier.verify(token)


@pytest.mark.asyncio
async def test_jwt_verifier_returns_claims_for_valid_token() -> None:
    async def _handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=TEST_JWKS_RESPONSE)

    async with build_mock_transport(_handler) as client:
        cache = JWKSCache(url=TEST_JWKS_URL, ttl_seconds=60, client=client)
        verifier = SupabaseJWTVerifier(jwks_cache=cache, audience=TEST_AUDIENCE, issuer=TEST_ISSUER)

        token = jwt.encode(
            claims={
                "sub": "1",
                "aud": TEST_AUDIENCE,
                "iss": TEST_ISSUER,
                "email": "user@example.com",
                "email_confirmed_at": "2025-01-01T00:00:00Z",
            },
            key=TEST_SECRET,
            algorithm="HS256",
            headers={"kid": "test-key"},
        )

        claims = await verifier.verify(token)

        assert claims["sub"] == "1"
        assert claims["email"] == "user@example.com"
        assert claims["email_confirmed_at"] == "2025-01-01T00:00:00Z"
