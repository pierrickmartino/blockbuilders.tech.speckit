from __future__ import annotations

from functools import lru_cache
from typing import Annotated
from urllib.parse import urljoin

from app.config import ASSET_SYMBOLS
from app.core.settings_supabase import SupabaseSettings

from pydantic import (
    AnyHttpUrl,
    Field,
    PositiveInt,
    PostgresDsn,
    SecretStr,
    TypeAdapter,
    computed_field,
    field_validator,
)
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

HTTP_URL_ADAPTER = TypeAdapter(AnyHttpUrl)


class Settings(BaseSettings):
    """Application runtime configuration with environment-backed overrides."""

    app_name: str = "blockbuilders-backend"
    app_version: str = "0.1.0-dev"
    service_host: str = "0.0.0.0"
    service_port: int = 8000
    database_url: PostgresDsn = Field(
        alias="DATABASE_URL",
        default="postgresql://postgres:postgres@localhost:5432/postgres",
    )
    supabase_url: AnyHttpUrl = Field(default="http://localhost:54321", alias="SUPABASE_URL")
    supabase_service_role_key: SecretStr = Field(
        default=SecretStr("local-dev-service-role"),
        alias="SUPABASE_SERVICE_ROLE_KEY",
    )
    supabase_jwt_audience: str = Field(default="authenticated", alias="SUPABASE_JWT_AUDIENCE")
    supabase_jwt_issuer: AnyHttpUrl = Field(
        default="http://localhost:54321/auth/v1",
        alias="SUPABASE_JWT_ISSUER",
    )
    supabase_jwks_url: AnyHttpUrl | None = Field(default=None, alias="SUPABASE_JWKS_URL")
    supabase_jwks_path: str = Field(default="/auth/v1/jwks", alias="SUPABASE_JWKS_PATH")
    supabase_jwt_cache_ttl_seconds: PositiveInt = Field(
        default=900,
        alias="SUPABASE_JWT_CACHE_TTL",
        description="JWKS cache TTL in seconds for Supabase public keys.",
    )
    asset_symbols: Annotated[tuple[str, ...], NoDecode] = Field(default=ASSET_SYMBOLS, alias="ASSET_SYMBOLS")
    freshness_threshold_minutes: PositiveInt = Field(default=60, alias="FRESHNESS_THRESHOLD_MINUTES")
    freshness_eval_minutes: PositiveInt = Field(default=10, alias="FRESHNESS_EVAL_MINUTES")
    alert_email_from: str = Field(default="alerts@example.com", alias="ALERT_EMAIL_FROM")
    alert_email_to: Annotated[tuple[str, ...], NoDecode] = Field(default=("alerts@example.com",), alias="ALERT_EMAIL_TO")
    alert_subject_prefix: str = Field(default="[OHLCV]", alias="ALERT_SUBJECT_PREFIX")
    status_page_url: AnyHttpUrl = Field(default="http://localhost:3000/status", alias="STATUS_PAGE_URL")

    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True, extra="ignore")

    @computed_field(return_type=SupabaseSettings)
    @property
    def supabase(self) -> SupabaseSettings:
        """Supabase integration settings derived from environment variables."""

        return SupabaseSettings(
            url=self.supabase_url,
            service_role_key=self.supabase_service_role_key,
            jwt_audience=self.supabase_jwt_audience,
            jwt_issuer=self.supabase_jwt_issuer,
            jwks_url=self._resolve_jwks_url(),
            jwks_cache_ttl_seconds=self.supabase_jwt_cache_ttl_seconds,
        )

    def _resolve_jwks_url(self) -> AnyHttpUrl:
        if self.supabase_jwks_url is not None:
            return self.supabase_jwks_url

        base = str(self.supabase_url).rstrip("/")
        path = self.supabase_jwks_path.lstrip("/")
        return HTTP_URL_ADAPTER.validate_python(urljoin(f"{base}/", path))

    @field_validator("asset_symbols", mode="before")
    @classmethod
    def _split_symbols(cls, value: str | tuple[str, ...]) -> tuple[str, ...]:
        if isinstance(value, str):
            return tuple(symbol.strip() for symbol in value.split(",") if symbol.strip())
        return tuple(value)

    @field_validator("alert_email_to", mode="before")
    @classmethod
    def _split_recipients(cls, value: str | tuple[str, ...]) -> tuple[str, ...]:
        if isinstance(value, str):
            return tuple(addr.strip() for addr in value.split(",") if addr.strip()) or (value,)
        return tuple(value)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance."""

    return Settings()


__all__ = ["Settings", "get_settings"]
