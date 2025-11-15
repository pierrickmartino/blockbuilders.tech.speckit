from __future__ import annotations

from typing import Annotated
from uuid import UUID

from app.dependencies.supabase import get_current_supabase_user
from app.schemas.auth import SupabaseUserProfile
from app.schemas.onboarding import (
    ChecklistResponse,
    ChecklistStepProgress,
    OverrideRequest,
    StepStatusRequest,
    TelemetryEvent,
    TemplateSelectRequest,
    TemplateSelectResponse,
)
from app.services.onboarding import (
    ChecklistConflictError,
    ChecklistNotFoundError,
    ChecklistService,
    ChecklistServiceProtocol,
    OverrideService,
    OverrideServiceProtocol,
    TelemetryService,
    TelemetryServiceProtocol,
    TemplateSelectionService,
    TemplateSelectionServiceProtocol,
)

from fastapi import APIRouter, Depends, HTTPException, Path, status

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])

CurrentUser = Annotated[SupabaseUserProfile, Depends(get_current_supabase_user)]


def get_checklist_service() -> ChecklistServiceProtocol:
    return ChecklistService()


def get_template_service() -> TemplateSelectionServiceProtocol:
    return TemplateSelectionService()


def get_override_service() -> OverrideServiceProtocol:
    return OverrideService()


def get_telemetry_service() -> TelemetryServiceProtocol:
    return TelemetryService()


ChecklistServiceDep = Annotated[ChecklistServiceProtocol, Depends(get_checklist_service)]
TemplateServiceDep = Annotated[TemplateSelectionServiceProtocol, Depends(get_template_service)]
OverrideServiceDep = Annotated[OverrideServiceProtocol, Depends(get_override_service)]
TelemetryServiceDep = Annotated[TelemetryServiceProtocol, Depends(get_telemetry_service)]


@router.get("/checklist", response_model=ChecklistResponse)
async def fetch_checklist(
    current_user: CurrentUser,
    service: ChecklistServiceDep,
) -> ChecklistResponse:
    workspace_id = _resolve_workspace_id(current_user)

    try:
        return await service.fetch_checklist(current_user.id, workspace_id)
    except ChecklistNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ChecklistConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except NotImplementedError as exc:
        raise _not_implemented() from exc


@router.post(
    "/steps/{step_id}/status",
    response_model=ChecklistStepProgress,
    summary="Update progress for a checklist step",
)
async def update_step_status(
    step_id: Annotated[str, Path(description="Checklist step identifier")],
    payload: StepStatusRequest,
    current_user: CurrentUser,
    service: ChecklistServiceDep,
) -> ChecklistStepProgress:
    workspace_id = _resolve_workspace_id(current_user)

    try:
        return await service.update_step_status(current_user.id, workspace_id, step_id, payload)
    except ChecklistNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ChecklistConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except NotImplementedError as exc:
        raise _not_implemented() from exc


@router.post(
    "/templates/{template_id}/select",
    response_model=TemplateSelectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def select_template(
    template_id: Annotated[UUID, Path(description="Starter template id")],
    payload: TemplateSelectRequest,
    current_user: CurrentUser,
    service: TemplateServiceDep,
) -> TemplateSelectResponse:
    workspace_id = _resolve_workspace_id(current_user)

    try:
        return await service.select_template(current_user.id, workspace_id, template_id, payload)
    except ChecklistNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ChecklistConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except NotImplementedError as exc:
        raise _not_implemented() from exc


@router.post("/overrides/mark-as-done", status_code=status.HTTP_202_ACCEPTED)
async def mark_as_done(
    payload: OverrideRequest,
    current_user: CurrentUser,
    service: OverrideServiceDep,
) -> None:
    workspace_id = _resolve_workspace_id(current_user)
    if payload.actor_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="actor mismatch")
    if payload.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="workspace mismatch")

    try:
        await service.mark_as_done(payload)
    except ChecklistConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except NotImplementedError as exc:
        raise _not_implemented() from exc


@router.post("/events", status_code=status.HTTP_202_ACCEPTED)
async def record_onboarding_event(
    payload: TelemetryEvent,
    current_user: CurrentUser,
    service: TelemetryServiceDep,
) -> None:
    workspace_id = _resolve_workspace_id(current_user)
    try:
        await service.record_event(current_user.id, workspace_id, payload)
    except NotImplementedError as exc:
        raise _not_implemented() from exc


def _resolve_workspace_id(user: SupabaseUserProfile) -> UUID:
    workspace_value = user.metadata.get("workspace_id")
    if workspace_value is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="workspace_id missing from metadata")

    try:
        return UUID(str(workspace_value))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="workspace_id invalid") from exc


def _not_implemented() -> HTTPException:
    return HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Onboarding service not implemented")


__all__ = ["router"]
