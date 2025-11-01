from __future__ import annotations

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, PositiveInt, SecretStr


class SupabaseSettings(BaseModel):
    """Supabase configuration shared across backend services."""

    url: AnyHttpUrl
    service_role_key: SecretStr
    jwt_audience: str
    jwt_issuer: AnyHttpUrl
    jwks_url: AnyHttpUrl
    jwks_cache_ttl_seconds: PositiveInt

    model_config = ConfigDict(frozen=True)


__all__ = ["SupabaseSettings"]
