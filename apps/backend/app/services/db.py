from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from functools import lru_cache

from app.core.settings import Settings, get_settings

import httpx
from psycopg import AsyncConnection
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool


class DatabasePool:
    """Thin wrapper around psycopg's async connection pool."""

    def __init__(self, settings: Settings) -> None:
        self._pool = AsyncConnectionPool(str(settings.database_url), open=False, kwargs={"row_factory": dict_row})

    async def open(self) -> None:
        await self._pool.open()

    async def close(self) -> None:
        await self._pool.close()

    @asynccontextmanager
    async def connection(self) -> AsyncIterator[AsyncConnection]:
        async with self._pool.connection() as conn:
            yield conn

    @asynccontextmanager
    async def transaction(self) -> AsyncIterator[AsyncConnection]:
        async with self._pool.connection() as conn:
            async with conn.transaction():
                yield conn

    @property
    def raw_pool(self) -> AsyncConnectionPool:
        return self._pool


class SupabaseRestClient:
    """Shared httpx client factory for Supabase REST/RPC calls."""

    def __init__(self, settings: Settings, timeout_seconds: float = 10.0) -> None:
        self.base_url = str(settings.supabase_url).rstrip("/")
        self.service_role_key = settings.supabase_service_role_key.get_secret_value()
        self.timeout_seconds = timeout_seconds

    @asynccontextmanager
    async def client(self) -> AsyncIterator[httpx.AsyncClient]:
        headers = {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
        }
        async with httpx.AsyncClient(base_url=self.base_url, headers=headers, timeout=self.timeout_seconds) as client:
            yield client


@lru_cache(maxsize=1)
def get_database_pool(settings: Settings | None = None) -> DatabasePool:
    runtime_settings = settings or get_settings()
    return DatabasePool(runtime_settings)


@lru_cache(maxsize=1)
def get_supabase_rest_client(settings: Settings | None = None) -> SupabaseRestClient:
    runtime_settings = settings or get_settings()
    return SupabaseRestClient(runtime_settings)


__all__ = [
    "DatabasePool",
    "SupabaseRestClient",
    "get_database_pool",
    "get_supabase_rest_client",
]
