from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies.supabase import get_current_supabase_user
from app.schemas.auth import SupabaseUserProfile

router = APIRouter(tags=["Profile"])


@router.get(
    "/me",
    response_model=SupabaseUserProfile,
    summary="Fetch the authenticated user's profile.",
)
async def retrieve_current_user(
    current_user: SupabaseUserProfile = Depends(get_current_supabase_user),
) -> SupabaseUserProfile:
    """Return the profile payload for the authenticated Supabase user."""

    return current_user


__all__ = ["router"]
