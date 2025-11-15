from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Mapping, Protocol
from uuid import UUID, uuid5

from app.schemas.onboarding import (
    ChecklistResponse,
    ChecklistStep,
    ChecklistStepProgress,
    OverrideRequest,
    StepStatus,
    StepStatusRequest,
    TelemetryEvent,
    TelemetryEventType,
    TemplateSelectRequest,
    TemplateSelectResponse,
)
from app.services.telemetry_forwarder import TelemetryForwarder

from .versioning import has_definition_changed

DEFAULT_CHECKLIST_ID = UUID("00000000-0000-0000-0000-000000000004")
DEFAULT_TEMPLATE_ID = UUID("00000000-0000-0000-0000-00000000A11A")
PROGRESS_NAMESPACE = UUID("5b2506ba-7f6b-5c70-8a65-65fc02832964")
OVERRIDE_CONFIRMATION_TOKEN = "override.confirmed.v1"


class ChecklistStateError(RuntimeError):
    """Base error for onboarding state transitions."""


class ChecklistNotFoundError(ChecklistStateError):
    """Raised when a referenced checklist step cannot be located."""


class ChecklistConflictError(ChecklistStateError):
    """Raised when a checklist transition violates business rules."""


@dataclass(frozen=True)
class StepDefinition:
    step_id: str
    sequence: int
    title: str
    description: str
    requires_disclosure: bool
    requires_template_edit: bool
    template_id: UUID | None = None
    disclosure_copy: str | None = None
    acknowledgement_token: str | None = None


@dataclass(frozen=True)
class ChecklistDefinition:
    checklist_id: UUID
    version: int
    steps: tuple[StepDefinition, ...]


@dataclass
class StepProgressRecord:
    progress_id: UUID
    status: StepStatus = StepStatus.NOT_STARTED
    completed_at: datetime | None = None
    completed_by: UUID | None = None
    acknowledgement_token: str | None = None
    template_diff: Dict[str, Any] | None = None
    override_reason: str | None = None
    override_actor_role: str | None = None
    override_pending: bool = False


@dataclass
class UserChecklistState:
    user_id: UUID
    workspace_id: UUID
    version: int
    steps: dict[str, StepProgressRecord] = field(default_factory=dict)
    override_pending: bool = False


def _default_definition() -> ChecklistDefinition:
    steps: list[StepDefinition] = [
        StepDefinition(
            step_id="disclosures",
            sequence=1,
            title="Review disclosures",
            description="Acknowledge trading risk disclosures before proceeding.",
            requires_disclosure=True,
            requires_template_edit=False,
            disclosure_copy=(
                "Trading strategies carry risk. Continuing confirms acceptance of the Blockbuilders Risk Statement."
            ),
            acknowledgement_token="ack-risk-statement-v1",
        ),
        StepDefinition(
            step_id="connect_data",
            sequence=2,
            title="Connect data sources",
            description="Link broker + market data so the workspace can stream quotes.",
            requires_disclosure=False,
            requires_template_edit=False,
        ),
        StepDefinition(
            step_id="select_template",
            sequence=3,
            title="Choose a starter template",
            description="Pick a curated strategy and edit one parameter before saving.",
            requires_disclosure=False,
            requires_template_edit=True,
            template_id=DEFAULT_TEMPLATE_ID,
        ),
        StepDefinition(
            step_id="run_backtest",
            sequence=4,
            title="Run your first backtest",
            description="Execute the primed strategy and review activation metrics.",
            requires_disclosure=False,
            requires_template_edit=False,
        ),
    ]
    return ChecklistDefinition(checklist_id=DEFAULT_CHECKLIST_ID, version=1, steps=tuple(steps))


class ChecklistStateStore:
    def __init__(self, definition: ChecklistDefinition | None = None) -> None:
        self._definition = definition or _default_definition()
        self._states: dict[tuple[UUID, UUID], UserChecklistState] = {}

    @property
    def definition(self) -> ChecklistDefinition:
        return self._definition

    def reset(self) -> None:
        self._states.clear()

    def get_step_definition(self, step_id: str) -> StepDefinition:
        for definition in self._definition.steps:
            if definition.step_id == step_id:
                return definition
        raise ChecklistNotFoundError(f"Unknown checklist step '{step_id}'")

    def iter_previous_steps(self, target: StepDefinition) -> Iterable[StepDefinition]:
        return (definition for definition in self._definition.steps if definition.sequence < target.sequence)

    def get_or_create_state(self, user_id: UUID, workspace_id: UUID) -> tuple[UserChecklistState, bool]:
        key = (user_id, workspace_id)
        state = self._states.get(key)
        definition_changed = has_definition_changed(
            self._definition.version,
            state.version if state else None,
        )

        if state is None or definition_changed:
            state = self._build_state(user_id, workspace_id)
            self._states[key] = state

        return state, definition_changed

    def set_override_pending(
        self,
        user_id: UUID,
        workspace_id: UUID,
        *,
        actor_id: UUID,
        reason: str,
        actor_role: str,
    ) -> UserChecklistState:
        state, _ = self.get_or_create_state(user_id, workspace_id)
        state.override_pending = True
        now = _now()
        for record in state.steps.values():
            record.status = StepStatus.COMPLETED
            record.completed_at = record.completed_at or now
            record.completed_by = actor_id
            record.override_reason = reason
            record.override_actor_role = actor_role
            record.override_pending = True
        return state

    def clear_override_pending(self, user_id: UUID, workspace_id: UUID) -> None:
        key = (user_id, workspace_id)
        state = self._states.get(key)
        if not state:
            return
        state.override_pending = False
        for record in state.steps.values():
            record.override_pending = False

    def _build_state(self, user_id: UUID, workspace_id: UUID) -> UserChecklistState:
        steps: dict[str, StepProgressRecord] = {}
        for definition in self._definition.steps:
            progress_id = uuid5(PROGRESS_NAMESPACE, f"{user_id}:{workspace_id}:{definition.step_id}")
            steps[definition.step_id] = StepProgressRecord(progress_id=progress_id)
        return UserChecklistState(
            user_id=user_id,
            workspace_id=workspace_id,
            version=self._definition.version,
            steps=steps,
            override_pending=False,
        )


GLOBAL_STORE = ChecklistStateStore()


def _now() -> datetime:
    return datetime.now(timezone.utc)


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
    async def record_event(
        self,
        user_id: UUID,
        workspace_id: UUID,
        payload: TelemetryEvent,
    ) -> None: ...


class ChecklistService(ChecklistServiceProtocol):
    def __init__(self, store: ChecklistStateStore | None = None) -> None:
        self._store = store or GLOBAL_STORE

    async def fetch_checklist(self, user_id: UUID, workspace_id: UUID) -> ChecklistResponse:
        state, definition_changed = self._store.get_or_create_state(user_id, workspace_id)
        steps = [self._build_step(definition, state) for definition in self._store.definition.steps]
        return ChecklistResponse(
            checklist_id=self._store.definition.checklist_id,
            version=self._store.definition.version,
            definition_changed=definition_changed,
             override_pending=state.override_pending,
            steps=steps,
        )

    async def update_step_status(
        self,
        user_id: UUID,
        workspace_id: UUID,
        step_id: str,
        payload: StepStatusRequest,
    ) -> ChecklistStepProgress:
        step_definition = self._store.get_step_definition(step_id)
        state, _ = self._store.get_or_create_state(user_id, workspace_id)
        record = state.steps[step_definition.step_id]
        next_status = payload.status

        if next_status is None:
            raise ChecklistConflictError("Status payload is required")

        if next_status is record.status:
            if next_status is StepStatus.COMPLETED:
                if payload.acknowledgement_token:
                    record.acknowledgement_token = payload.acknowledgement_token
                if payload.template_diff is not None:
                    record.template_diff = payload.template_diff
            return ChecklistStepProgress(
                progress_id=record.progress_id,
                step_id=step_definition.step_id,
                status=record.status,
                completed_at=record.completed_at,
            )

        if next_status is StepStatus.COMPLETED:
            self._validate_completion(step_definition, payload, state)
            record.completed_at = _now()
            record.completed_by = user_id
        else:
            record.completed_at = None
            record.completed_by = None

        record.status = next_status
        record.acknowledgement_token = payload.acknowledgement_token or record.acknowledgement_token
        if payload.template_diff is not None:
            record.template_diff = payload.template_diff
        record.override_reason = None
        record.override_actor_role = None
        record.override_pending = False

        return ChecklistStepProgress(
            progress_id=record.progress_id,
            step_id=step_definition.step_id,
            status=record.status,
            completed_at=record.completed_at,
        )

    def _build_step(self, definition: StepDefinition, state: UserChecklistState) -> ChecklistStep:
        record = state.steps[definition.step_id]
        payload: dict[str, Any] = {
            "stepId": definition.step_id,
            "title": definition.title,
            "description": definition.description,
            "requiresDisclosure": definition.requires_disclosure,
            "requiresTemplateEdit": definition.requires_template_edit,
            "status": record.status,
        }
        if definition.template_id:
            payload["templateId"] = definition.template_id
        if definition.requires_disclosure:
            payload["disclosure"] = {
                "text": definition.disclosure_copy or "",
                "acknowledgementToken": definition.acknowledgement_token,
            }
        payload["overridePending"] = record.override_pending or state.override_pending
        if record.override_reason:
            payload["overrideReason"] = record.override_reason
        if record.override_actor_role:
            payload["overrideActorRole"] = record.override_actor_role
        return ChecklistStep.model_validate(payload)

    def _validate_completion(
        self,
        definition: StepDefinition,
        payload: StepStatusRequest,
        state: UserChecklistState,
    ) -> None:
        if definition.requires_disclosure:
            token = payload.acknowledgement_token
            expected = definition.acknowledgement_token
            if not token:
                raise ChecklistConflictError("Disclosure acknowledgement required before completing this step")
            if expected and token != expected:
                raise ChecklistConflictError("Disclosure acknowledgement required before completing this step")

        if definition.requires_template_edit:
            diff = payload.template_diff
            if not isinstance(diff, Mapping) or len(diff) == 0:
                raise ChecklistConflictError("Template edit diff required before completing this step")

        for previous in self._store.iter_previous_steps(definition):
            previous_status = state.steps[previous.step_id].status
            if previous_status is not StepStatus.COMPLETED:
                raise ChecklistConflictError(
                    f"Cannot complete {definition.step_id} until '{previous.step_id}' is completed",
                )


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
    def __init__(
        self,
        store: ChecklistStateStore | None = None,
        forwarder: TelemetryForwarder | None = None,
    ) -> None:
        self._store = store or GLOBAL_STORE
        self._forwarder = forwarder or TelemetryForwarder()

    async def mark_as_done(self, payload: OverrideRequest) -> None:
        if payload.confirmation_token != OVERRIDE_CONFIRMATION_TOKEN:
            raise ChecklistConflictError("Override requires dual confirmation token")

        self._store.set_override_pending(
            payload.user_id,
            payload.workspace_id,
            actor_id=payload.actor_id,
            reason=payload.reason,
            actor_role=payload.actor_role,
        )

        event = TelemetryEvent(
            event_type=TelemetryEventType.OVERRIDE,
            metadata={
                "userId": str(payload.user_id),
                "workspaceId": str(payload.workspace_id),
                "actorId": str(payload.actor_id),
                "reason": payload.reason,
            },
        )
        self._forwarder.forward(event)


class TelemetryService(TelemetryServiceProtocol):
    _DEDUP_TYPES = {
        TelemetryEventType.STEP_COMPLETE,
        TelemetryEventType.DISCLOSURE_ACK,
        TelemetryEventType.TEMPLATE_SELECTED,
    }

    def __init__(
        self,
        forwarder: TelemetryForwarder | None = None,
        store: ChecklistStateStore | None = None,
    ) -> None:
        self._forwarder = forwarder or TelemetryForwarder()
        self._store = store or GLOBAL_STORE
        self._dedupe_cache: set[tuple[str, str, str, str, str]] = set()

    async def record_event(self, user_id: UUID, workspace_id: UUID, payload: TelemetryEvent) -> None:
        state, _ = self._store.get_or_create_state(user_id, workspace_id)
        payload.metadata.setdefault("userId", str(user_id))
        payload.metadata.setdefault("workspaceId", str(workspace_id))

        dedupe_key = (
            str(user_id),
            str(workspace_id),
            payload.event_type.value,
            payload.step_id or "*",
            str(state.version),
        )

        if payload.event_type in self._DEDUP_TYPES:
            if dedupe_key in self._dedupe_cache:
                return
            self._dedupe_cache.add(dedupe_key)

        self._forwarder.forward(payload)

        if payload.event_type is TelemetryEventType.BACKTEST_SUCCESS:
            self._store.clear_override_pending(user_id, workspace_id)


def reset_onboarding_state() -> None:
    GLOBAL_STORE.reset()


__all__ = [
    "ChecklistService",
    "ChecklistServiceProtocol",
    "ChecklistConflictError",
    "ChecklistNotFoundError",
    "OverrideService",
    "OverrideServiceProtocol",
    "TemplateSelectionService",
    "TemplateSelectionServiceProtocol",
    "TelemetryService",
    "TelemetryServiceProtocol",
    "reset_onboarding_state",
]
