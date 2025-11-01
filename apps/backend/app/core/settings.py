from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application runtime configuration with environment-backed overrides."""

    app_name: str = "blockbuilders-backend"
    app_version: str = "0.1.0-dev"
    service_host: str = "0.0.0.0"
    service_port: int = 8000

    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True, extra="ignore")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance."""

    return Settings()


__all__ = ["Settings", "get_settings"]
