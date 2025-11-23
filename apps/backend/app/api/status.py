from __future__ import annotations

from typing import Annotated

from app.schemas.ohlcv import IssueType, RemediationResponse, StatusSummaryResponse
from app.services.status_service import StatusServiceProtocol, get_status_service

from fastapi import APIRouter, Depends, HTTPException, Query, status

router = APIRouter(prefix="/status", tags=["status"])

StatusServiceDep = Annotated[StatusServiceProtocol, Depends(get_status_service)]


@router.get("/summary", status_code=status.HTTP_200_OK, response_model=StatusSummaryResponse)
async def get_status_summary(
    service: StatusServiceDep,
    only_stale: Annotated[bool, Query(description="Return only stale assets", alias="only_stale")] = False,
) -> StatusSummaryResponse:
    """Return coverage and freshness per asset/interval."""

    assets = await service.get_summary(only_stale=only_stale)
    return StatusSummaryResponse(assets=assets)


@router.get("/remediation", status_code=status.HTTP_200_OK, response_model=RemediationResponse)
async def get_remediation_entries(
    service: StatusServiceDep,
    asset: Annotated[str | None, Query(description="Asset symbol filter")] = None,
    issue_type: Annotated[IssueType | None, Query(description="Issue type filter")] = None,
) -> RemediationResponse:
    """Return remediation log entries respecting optional filters."""

    if asset is not None and not asset.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="asset must be non-empty when provided")

    items = await service.get_remediation_entries(asset=asset, issue_type=issue_type)
    return RemediationResponse(items=items)


__all__ = ["get_status_service", "router"]
