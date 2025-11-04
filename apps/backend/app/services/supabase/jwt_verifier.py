from __future__ import annotations

from typing import Any

from app.services.supabase.jwks_cache import JWKSCache, JWKSFetchError
from app.services.supabase.logging import log_auth_failure, log_auth_success

from jose import JWTError, jwt


class SupabaseJWTVerificationError(RuntimeError):
    """Raised when Supabase JWT verification fails."""


class SupabaseJWTVerifier:
    """Validate Supabase-issued JWTs using cached JWKS material."""

    def __init__(
        self,
        jwks_cache: JWKSCache,
        audience: str,
        issuer: str,
    ) -> None:
        self._jwks_cache = jwks_cache
        self._audience = audience
        self._issuer = issuer

    async def verify(self, token: str) -> dict[str, Any]:
        """Validate the provided token and return the decoded claims."""

        if not token:
            raise SupabaseJWTVerificationError("missing Supabase access token")

        try:
            header = jwt.get_unverified_header(token)
        except JWTError as exc:
            raise SupabaseJWTVerificationError("invalid token header") from exc

        kid = header.get("kid")
        alg = header.get("alg")

        if not kid or not alg:
            raise SupabaseJWTVerificationError("token missing kid or alg header")

        try:
            jwks = await self._jwks_cache.get_jwks()
        except JWKSFetchError as exc:
            log_auth_failure("jwks_unavailable")
            raise SupabaseJWTVerificationError("unable to load Supabase JWKS") from exc

        key_dict = self._find_key(jwks, kid)
        if key_dict is None:
            log_auth_failure("jwks_key_not_found")
            raise SupabaseJWTVerificationError("no matching JWK for supplied token")

        try:
            claims = jwt.decode(
                token,
                key_dict,
                algorithms=[alg],
                audience=self._audience,
                issuer=self._issuer,
            )
        except JWTError as exc:
            log_auth_failure("jwt_decode_failed")
            raise SupabaseJWTVerificationError("Supabase JWT verification failed") from exc

        email_confirmed_at = claims.get("email_confirmed_at")
        if not email_confirmed_at:
            log_auth_failure("email_not_confirmed", user_id=claims.get("sub"))
            raise SupabaseJWTVerificationError("email address has not been confirmed")

        log_auth_success(claims)

        return dict(claims)

    @staticmethod
    def _find_key(jwks: dict[str, Any], kid: str) -> dict[str, Any] | None:
        keys = jwks.get("keys", [])
        for key in keys:
            if key.get("kid") == kid:
                # Copy so downstream callers cannot mutate cache contents.
                return dict(key)
        return None


__all__ = ["SupabaseJWTVerificationError", "SupabaseJWTVerifier"]
