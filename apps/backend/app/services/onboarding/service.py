from __future__ import annotations

from typing import Protocol
from uuid import UUID

from app.schemas.onboarding import (
    ChecklistResponse,
    ChecklistStepProgress,
    OverrideRequest,
    StepStatusRequest,
    TelemetryEvent,
    TemplateSelectRequest,
    TemplateSelectResponse,
)
from app.services.telemetry_forwarder import TelemetryForwarder


class ChecklistServiceProtocol(Protocol):
    async def fetch_checklist(self, user_id: UUID, workspace_id: UUID) -> ChecklistResponse: ...

    async def update_step_status(
        self,
        user_id: UUID,
        workspace_id: UUID,
        step_id: str,
        payload: StepStatusRequest,
    ) -> ChecklistStepProgress: ...


class TemplateSelectionServiceProtocol(Protocol):
    async def select_template(
        self,
        user_id: UUID,
        workspace_id: UUID,
        template_id: UUID,
        payload: TemplateSelectRequest,
    ) -> TemplateSelectResponse: ...


class OverrideServiceProtocol(Protocol):
    async def mark_as_done(self, payload: OverrideRequest) -> None: ...


class TelemetryServiceProtocol(Protocol):
    async def record_event(self, payload: TelemetryEvent) -> None: ...


class ChecklistService(ChecklistServiceProtocol):
    async def fetch_checklist(self, user_id: UUID, workspace_id: UUID) -> ChecklistResponse:
        raise NotImplementedError("Checklist service not implemented yet")

    async def update_step_status(
        self,
        user_id: UUID,
        workspace_id: UUID,
        step_id: str,
        payload: StepStatusRequest,
    ) -> ChecklistStepProgress:
        raise NotImplementedError("Checklist service not implemented yet")


class TemplateSelectionService(TemplateSelectionServiceProtocol):
    async def select_template(
        self,
        user_id: UUID,
        workspace_id: UUID,
        template_id: UUID,
        payload: TemplateSelectRequest,
    ) -> TemplateSelectResponse:
        raise NotImplementedError("Template service not implemented yet")


class OverrideService(OverrideServiceProtocol):
    async def mark_as_done(self, payload: OverrideRequest) -> None:
        raise NotImplementedError("Override service not implemented yet")


class TelemetryService(TelemetryServiceProtocol):
    def __init__(self, forwarder: TelemetryForwarder | None = None) -> None:
        self._forwarder = forwarder or TelemetryForwarder()

    async def record_event(self, payload: TelemetryEvent) -> None:
        self._forwarder.forward(payload)


__all__ = [
    "ChecklistService",
    "ChecklistServiceProtocol",
    "OverrideService",
    "OverrideServiceProtocol",
    "TemplateSelectionService",
    "TemplateSelectionServiceProtocol",
    "TelemetryService",
    "TelemetryServiceProtocol",
]
