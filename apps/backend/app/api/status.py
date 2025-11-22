from __future__ import annotations

from typing import Annotated

from app.schemas.ohlcv import IssueType

from fastapi import APIRouter, HTTPException, Query, status

router = APIRouter(prefix="/status", tags=["status"])


@router.get("/summary", status_code=status.HTTP_200_OK)
async def get_status_summary(
    only_stale: Annotated[bool, Query(description="Return only stale assets", alias="only_stale")] = False,
) -> dict:
    """Placeholder summary endpoint matching the contract shape."""

    return {"assets": [], "filters": {"only_stale": only_stale}}


@router.get("/remediation", status_code=status.HTTP_200_OK)
async def get_remediation_entries(
    asset: Annotated[str | None, Query(description="Asset symbol filter")] = None,
    issue_type: Annotated[IssueType | None, Query(description="Issue type filter")] = None,
) -> dict:
    """Return remediation log entries (stubbed until repositories are implemented)."""

    if asset is not None and not asset.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="asset must be non-empty when provided")

    return {"items": [], "filters": {"asset": asset, "issue_type": issue_type.value if issue_type else None}}


__all__ = ["router"]
