from __future__ import annotations

import hashlib
import logging
from collections.abc import Mapping
from typing import Any

LOGGER = logging.getLogger("app.auth.supabase")


def _hash_identifier(value: str | None) -> str | None:
    if not value:
        return None

    digest = hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()
    return f"sha256:{digest[:24]}"


def log_auth_success(claims: Mapping[str, Any]) -> None:
    """Emit a structured log entry when Supabase authentication succeeds."""

    LOGGER.info(
        "Supabase JWT verified",
        extra={
            "event": "supabase_auth_verified",
            "channel": "backend",
            "user_id_hash": _hash_identifier(str(claims.get("sub"))) if claims.get("sub") else None,
            "email_hash": _hash_identifier(str(claims.get("email"))) if claims.get("email") else None,
            "pii": "redacted",
        },
    )


def log_auth_failure(reason: str, *, user_id: str | None = None) -> None:
    """Emit a structured warning for failed Supabase authentication attempts."""

    LOGGER.warning(
        "Supabase JWT verification failed",
        extra={
            "event": "supabase_auth_failed",
            "channel": "backend",
            "reason": reason,
            "user_id_hash": _hash_identifier(user_id),
            "pii": "redacted",
        },
    )


__all__ = ["LOGGER", "log_auth_failure", "log_auth_success"]
