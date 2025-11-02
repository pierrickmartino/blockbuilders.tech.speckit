from __future__ import annotations

import logging
from typing import Any, Mapping

LOGGER = logging.getLogger("app.auth.supabase")


def log_auth_success(claims: Mapping[str, Any]) -> None:
    """Emit a structured log entry when Supabase authentication succeeds."""

    LOGGER.info(
        "Supabase JWT verified",
        extra={
            "event": "supabase_auth_verified",
            "user_id": claims.get("sub"),
            "email": claims.get("email"),
        },
    )


def log_auth_failure(reason: str, *, user_id: str | None = None) -> None:
    """Emit a structured warning for failed Supabase authentication attempts."""

    LOGGER.warning(
        "Supabase JWT verification failed",
        extra={
            "event": "supabase_auth_failed",
            "reason": reason,
            "user_id": user_id,
        },
    )


__all__ = ["LOGGER", "log_auth_failure", "log_auth_success"]
