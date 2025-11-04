from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from app.core.settings import Settings, get_settings
from app.schemas.auth import SupabaseUserProfile
from app.services.supabase import (
    JWKSCache,
    SupabaseJWTVerificationError,
    SupabaseJWTVerifier,
    log_auth_failure,
)

from fastapi import Depends, Header, HTTPException, Request, status
from pydantic import ValidationError

AuthorizationHeader = Annotated[str | None, Header(alias="Authorization")]


@lru_cache(maxsize=1)
def _cached_jwks_cache(url: str, ttl_seconds: int) -> JWKSCache:
    return JWKSCache(url=url, ttl_seconds=ttl_seconds)


def get_jwks_cache(
    settings: Annotated[Settings, Depends(get_settings)],
) -> JWKSCache:
    """Provide a shared JWKS cache for Supabase JWT verification."""

    supabase = settings.supabase
    return _cached_jwks_cache(str(supabase.jwks_url), supabase.jwks_cache_ttl_seconds)


def get_jwt_verifier(
    settings: Annotated[Settings, Depends(get_settings)],
    jwks_cache: Annotated[JWKSCache, Depends(get_jwks_cache)],
) -> SupabaseJWTVerifier:
    """Provide a Supabase JWT verifier using shared settings and JWKS cache."""

    supabase = settings.supabase
    return SupabaseJWTVerifier(
        jwks_cache=jwks_cache,
        audience=supabase.jwt_audience,
        issuer=str(supabase.jwt_issuer),
    )


async def get_current_supabase_user(
    request: Request,
    verifier: Annotated[SupabaseJWTVerifier, Depends(get_jwt_verifier)],
    authorization: AuthorizationHeader = None,
) -> SupabaseUserProfile:
    """Resolve the authenticated Supabase user from the incoming request."""

    token = _extract_bearer_token(authorization)
    _require_csrf_protection(request)

    try:
        claims = await verifier.verify(token)
    except SupabaseJWTVerificationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="authentication required") from exc

    try:
        profile = SupabaseUserProfile.model_validate(
            {
                "id": claims.get("sub"),
                "email": claims.get("email"),
                "email_confirmed_at": claims.get("email_confirmed_at"),
                "last_sign_in_at": claims.get("last_sign_in_at"),
                "metadata": claims.get("user_metadata") or claims.get("app_metadata") or {},
            }
        )
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="authentication required") from exc

    return profile


def _extract_bearer_token(header_value: str | None) -> str:
    if not header_value:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="authentication required")

    scheme, _, token = header_value.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="authentication required")

    return token


def _require_csrf_protection(request: Request) -> None:
    cookies = request.cookies
    has_session_cookie = any(
        cookie_name in cookies for cookie_name in ("sb-access-token", "sb-refresh-token")
    )

    if not has_session_cookie:
        return

    csrf_header = request.headers.get("x-csrf-token")
    csrf_cookie = cookies.get("sb-csrf-token")

    if not csrf_header or csrf_header != csrf_cookie:
        log_auth_failure("csrf_mismatch")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="csrf token missing or invalid",
        )


__all__ = ["get_current_supabase_user", "get_jwks_cache", "get_jwt_verifier"]
