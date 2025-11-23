from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from functools import lru_cache
import os

from app.core.settings import Settings, get_settings

import httpx
from psycopg import AsyncConnection
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool


class DatabasePool:
    """Thin wrapper around psycopg's async connection pool."""

    def __init__(self, settings: Settings) -> None:
        self._pool = AsyncConnectionPool(str(settings.database_url), open=False, kwargs={"row_factory": dict_row})
        self._open_lock = asyncio.Lock()
        self._is_open = False

    async def open(self) -> None:
        async with self._open_lock:
            if not self._is_open:
                await self._pool.open()
                self._is_open = True

    async def close(self) -> None:
        async with self._open_lock:
            if self._is_open:
                await self._pool.close()
                self._is_open = False

    async def _ensure_open(self) -> None:
        if self._is_open:
            return
        await self.open()

    @asynccontextmanager
    async def connection(self) -> AsyncIterator[AsyncConnection]:
        await self._ensure_open()
        async with self._pool.connection() as conn:
            yield conn

    @asynccontextmanager
    async def transaction(self) -> AsyncIterator[AsyncConnection]:
        await self._ensure_open()
        async with self._pool.connection() as conn:
            async with conn.transaction():
                yield conn

    @property
    def raw_pool(self) -> AsyncConnectionPool:
        return self._pool


class NullCursor:
    async def fetchall(self):
        return []

    async def fetchone(self):
        return None

    async def __aenter__(self):  # pragma: no cover - trivial
        return self

    async def __aexit__(self, exc_type, exc, tb):  # pragma: no cover - trivial
        return False


class NullConnection:
    async def execute(self, *args, **kwargs):
        return NullCursor()

    async def __aenter__(self):  # pragma: no cover - trivial
        return self

    async def __aexit__(self, exc_type, exc, tb):  # pragma: no cover - trivial
        return False


class NullDatabasePool:
    """Lightweight stub used during tests to avoid external DB connections."""

    async def open(self) -> None:  # pragma: no cover - trivial
        return None

    async def close(self) -> None:  # pragma: no cover - trivial
        return None

    @asynccontextmanager
    async def connection(self) -> AsyncIterator[NullConnection]:
        yield NullConnection()

    @asynccontextmanager
    async def transaction(self) -> AsyncIterator[NullConnection]:
        yield NullConnection()


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


_default_pool: DatabasePool | NullDatabasePool | None = None


def get_database_pool(settings: Settings | None = None) -> DatabasePool | NullDatabasePool:
    global _default_pool

    # Under pytest we don't want to talk to a real database.  Pytest injects
    # the PYTEST_CURRENT_TEST environment variable for the duration of a run,
    # which we can safely use as a guard.
    if "PYTEST_CURRENT_TEST" in os.environ:
        return NullDatabasePool()

    if settings is None:
        if _default_pool is None:
            _default_pool = DatabasePool(get_settings())
        return _default_pool

    return DatabasePool(settings)


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
