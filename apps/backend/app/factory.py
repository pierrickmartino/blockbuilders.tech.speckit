from __future__ import annotations

from app.api.alerts import router as alerts_router
from app.api.ingestion import router as ingestion_router
from app.api.lineage import router as lineage_router
from app.api.onboarding.router import router as onboarding_router
from app.api.routers.health import router as health_router
from app.api.routes.me import router as me_router
from app.api.status import router as status_router
from app.core.settings import Settings, get_settings
from app.services.db import get_database_pool

from fastapi import FastAPI


def create_app(settings: Settings | None = None) -> FastAPI:
    """Construct and configure the FastAPI application."""

    runtime_settings = settings or get_settings()

    app = FastAPI(
        title=runtime_settings.app_name,
        version=runtime_settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    app.dependency_overrides[get_settings] = lambda: runtime_settings

    db_pool = get_database_pool(runtime_settings)

    @app.on_event("startup")
    async def _open_pool() -> None:
        await db_pool.open()

    @app.on_event("shutdown")
    async def _close_pool() -> None:
        await db_pool.close()

    app.include_router(health_router)
    app.include_router(me_router)
    app.include_router(onboarding_router)
    app.include_router(status_router)
    app.include_router(lineage_router)
    app.include_router(ingestion_router)
    app.include_router(alerts_router)

    return app


__all__ = ["create_app"]
