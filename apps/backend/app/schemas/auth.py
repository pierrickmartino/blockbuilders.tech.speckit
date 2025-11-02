from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class SupabaseUserProfile(BaseModel):
    """Subset of Supabase user claims exposed by the `/me` endpoint."""

    id: UUID
    email: EmailStr
    email_confirmed_at: datetime
    last_sign_in_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(frozen=True)


__all__ = ["SupabaseUserProfile"]
