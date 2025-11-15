from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, PositiveInt


class StepStatus(str, Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class DisclosurePayload(BaseModel):
    text: str
    acknowledgement_token: Optional[str] = None

    model_config = ConfigDict(frozen=True)


class ChecklistStep(BaseModel):
    step_id: str = Field(alias="stepId")
    title: str
    description: str
    requires_disclosure: bool = Field(alias="requiresDisclosure")
    requires_template_edit: bool = Field(alias="requiresTemplateEdit")
    status: StepStatus = StepStatus.NOT_STARTED
    disclosure: Optional[DisclosurePayload] = None
    template_id: Optional[UUID] = Field(default=None, alias="templateId")
    override_pending: bool = Field(default=False, alias="overridePending")
    override_reason: Optional[str] = Field(default=None, alias="overrideReason")
    override_actor_role: Optional[str] = Field(default=None, alias="overrideActorRole")

    model_config = ConfigDict(populate_by_name=True, frozen=True)


class ChecklistStepProgress(BaseModel):
    progress_id: UUID = Field(alias="progressId")
    step_id: str = Field(alias="stepId")
    status: StepStatus
    completed_at: Optional[datetime] = Field(default=None, alias="completedAt")

    model_config = ConfigDict(populate_by_name=True, frozen=True)


class ChecklistResponse(BaseModel):
    checklist_id: UUID = Field(alias="checklistId")
    version: PositiveInt
    definition_changed: bool = Field(alias="definitionChanged")
    steps: list[ChecklistStep]
    override_pending: bool = Field(default=False, alias="overridePending")

    model_config = ConfigDict(populate_by_name=True, frozen=True)


class StepStatusRequest(BaseModel):
    status: StepStatus
    acknowledgement_token: Optional[str] = Field(default=None, alias="acknowledgementToken")
    template_diff: Optional[Dict[str, Any]] = Field(default=None, alias="templateDiff")

    model_config = ConfigDict(populate_by_name=True)


class TemplateSelectRequest(BaseModel):
    parameter_changes: Dict[str, Any] = Field(alias="parameterChanges")
    draft_name: Optional[str] = Field(default=None, alias="draftName")
    canvas_context: Dict[str, Any] = Field(default_factory=dict, alias="canvasContext")

    model_config = ConfigDict(populate_by_name=True)


class TemplateSelectResponse(BaseModel):
    draft_strategy_id: UUID = Field(alias="draftStrategyId")
    checklist_step: ChecklistStep = Field(alias="checklistStep")

    model_config = ConfigDict(populate_by_name=True, frozen=True)


class OverrideRequest(BaseModel):
    user_id: UUID = Field(alias="userId")
    workspace_id: UUID = Field(alias="workspaceId")
    reason: str
    actor_id: UUID = Field(alias="actorId")
    actor_role: str = Field(alias="actorRole")
    confirmation_token: str = Field(alias="confirmationToken")

    model_config = ConfigDict(populate_by_name=True)


class TelemetryEventType(str, Enum):
    VIEWED = "viewed"
    STEP_START = "step_start"
    STEP_COMPLETE = "step_complete"
    TEMPLATE_SELECTED = "template_selected"
    DISCLOSURE_ACK = "disclosure_ack"
    OVERRIDE = "override"
    OVERRIDE_PENDING_CLEARED = "override_pending_cleared"
    BACKTEST_SUCCESS = "backtest_success"


class TelemetryEvent(BaseModel):
    event_type: TelemetryEventType = Field(alias="eventType")
    step_id: Optional[str] = Field(default=None, alias="stepId")
    template_id: Optional[UUID] = Field(default=None, alias="templateId")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="occurredAt")
    client_context: Dict[str, Any] = Field(default_factory=dict, alias="clientContext")

    model_config = ConfigDict(populate_by_name=True)


__all__ = [
    "ChecklistResponse",
    "ChecklistStep",
    "ChecklistStepProgress",
    "DisclosurePayload",
    "OverrideRequest",
    "StepStatus",
    "StepStatusRequest",
    "TelemetryEvent",
    "TelemetryEventType",
    "TemplateSelectRequest",
    "TemplateSelectResponse",
]
