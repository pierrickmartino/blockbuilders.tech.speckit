from __future__ import annotations

import asyncio
from collections.abc import Mapping
from typing import Any

import httpx
from cachetools import TTLCache


class JWKSFetchError(RuntimeError):
    """Raised when Supabase JWKS keys cannot be fetched or parsed."""


class JWKSCache:
    """Fetch and cache Supabase JWKS responses with a time-to-live policy."""

    _CACHE_KEY = "jwks"

    def __init__(
        self,
        url: str,
        ttl_seconds: float,
        client: httpx.AsyncClient | None = None,
        request_timeout: float = 5.0,
    ) -> None:
        self._url = url
        self._owns_client = client is None
        self._client = client
        self._timeout = request_timeout
        self._cache: TTLCache[str, dict[str, Any]] = TTLCache(maxsize=1, ttl=ttl_seconds)
        self._lock = asyncio.Lock()

    async def get_jwks(self) -> dict[str, Any]:
        """Return the cached JWKS payload, fetching and caching when expired."""

        async with self._lock:
            cached = self._cache.get(self._CACHE_KEY)
            if cached is not None:
                return cached

            payload = await self._fetch()
            self._cache[self._CACHE_KEY] = payload
            return payload

    async def aclose(self) -> None:
        """Close the underlying HTTP client if this cache owns it."""

        if self._owns_client and self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _fetch(self) -> dict[str, Any]:
        try:
            if self._client is None:
                async with httpx.AsyncClient(timeout=self._timeout) as client:
                    return await self._request(client)

            return await self._request(self._client)
        except httpx.HTTPError as exc:
            raise JWKSFetchError("failed to fetch Supabase JWKS payload") from exc

    async def _request(self, client: httpx.AsyncClient) -> dict[str, Any]:
        response = await client.get(self._url, headers={"accept": "application/json"})
        response.raise_for_status()

        payload = response.json()
        if not isinstance(payload, Mapping) or "keys" not in payload:
            raise JWKSFetchError("invalid JWKS response returned from Supabase")

        return dict(payload)


__all__ = ["JWKSCache", "JWKSFetchError"]
