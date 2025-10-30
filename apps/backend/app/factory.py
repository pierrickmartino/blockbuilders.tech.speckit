from __future__ import annotations

from fastapi import FastAPI

from app.api.routers.health import router as health_router
from app.core.settings import Settings, get_settings


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
    app.include_router(health_router)

    return app


__all__ = ["create_app"]
