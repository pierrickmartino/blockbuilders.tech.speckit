from __future__ import annotations

from functools import lru_cache
from urllib.parse import urljoin

from app.core.settings_supabase import SupabaseSettings

from pydantic import AnyHttpUrl, Field, PositiveInt, SecretStr, TypeAdapter, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

HTTP_URL_ADAPTER = TypeAdapter(AnyHttpUrl)


class Settings(BaseSettings):
    """Application runtime configuration with environment-backed overrides."""

    app_name: str = "blockbuilders-backend"
    app_version: str = "0.1.0-dev"
    service_host: str = "0.0.0.0"
    service_port: int = 8000
    supabase_url: AnyHttpUrl = Field(alias="SUPABASE_URL")
    supabase_service_role_key: SecretStr = Field(alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_jwt_audience: str = Field(default="authenticated", alias="SUPABASE_JWT_AUDIENCE")
    supabase_jwt_issuer: AnyHttpUrl = Field(alias="SUPABASE_JWT_ISSUER")
    supabase_jwks_url: AnyHttpUrl | None = Field(default=None, alias="SUPABASE_JWKS_URL")
    supabase_jwks_path: str = Field(default="/auth/v1/jwks", alias="SUPABASE_JWKS_PATH")
    supabase_jwt_cache_ttl_seconds: PositiveInt = Field(
        default=900,
        alias="SUPABASE_JWT_CACHE_TTL",
        description="JWKS cache TTL in seconds for Supabase public keys.",
    )

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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance."""

    return Settings()


__all__ = ["Settings", "get_settings"]
