from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, ClassVar, Protocol
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

from .approvals import LocaleApprovalRegistry, LocaleApprovalStatus, get_locale_registry
from .templates import StarterTemplateDefinition, TemplateCatalog, get_template_catalog
from .versioning import has_definition_changed

DEFAULT_CHECKLIST_ID = UUID("00000000-0000-0000-0000-000000000004")
DEFAULT_TEMPLATE_ID = UUID("00000000-0000-0000-0000-00000000A11A")
PROGRESS_NAMESPACE = UUID("5b2506ba-7f6b-5c70-8a65-65fc02832964")
DRAFT_NAMESPACE = UUID("e0d2f90e-c65c-4dc9-9c7b-b8f9af9b931f")
OVERRIDE_CONFIRMATION_TOKEN = "override.confirmed.v1"
DEFAULT_LOCALE = "en-US"
DEFAULT_EVIDENCE_LINK = "docs/qa/onboarding-checklist.md"


class ChecklistStateError(RuntimeError):
    """Base error for onboarding state transitions."""


class ChecklistNotFoundError(ChecklistStateError):
    """Raised when a referenced checklist step cannot be located."""


class ChecklistConflictError(ChecklistStateError):
    """Raised when a checklist transition violates business rules."""

    def __init__(self, message: str, *, code: str | None = None, context: Mapping[str, Any] | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.context = dict(context or {})


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
    template_diff: dict[str, Any] | None = None
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
    return datetime.now(UTC)


class ChecklistServiceProtocol(Protocol):
    async def fetch_checklist(
        self,
        user_id: UUID,
        workspace_id: UUID,
        *,
        locale: str | None = None,
    ) -> ChecklistResponse: ...

    async def update_step_status(
        self,
        user_id: UUID,
        workspace_id: UUID,
        step_id: str,
        payload: StepStatusRequest,
        *,
        locale: str | None = None,
    ) -> ChecklistStepProgress: ...

    def get_locale_status(self, locale: str | None = None) -> LocaleApprovalStatus: ...

    def ensure_locale_approved(self, locale: str | None = None) -> LocaleApprovalStatus: ...


class TemplateSelectionServiceProtocol(Protocol):
    async def select_template(
        self,
        user_id: UUID,
        workspace_id: UUID,
        template_id: UUID,
        payload: TemplateSelectRequest,
        *,
        locale: str | None = None,
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
    def __init__(
        self,
        store: ChecklistStateStore | None = None,
        catalog: TemplateCatalog | None = None,
        locale_registry: LocaleApprovalRegistry | None = None,
    ) -> None:
        self._store = store or GLOBAL_STORE
        self._catalog = catalog or get_template_catalog()
        self._locale_registry = locale_registry or get_locale_registry()

    async def fetch_checklist(
        self,
        user_id: UUID,
        workspace_id: UUID,
        *,
        locale: str | None = None,
    ) -> ChecklistResponse:
        locale_status = self.get_locale_status(locale)
        state, definition_changed = self._store.get_or_create_state(user_id, workspace_id)
        steps = [self._build_step(definition, state, locale_status) for definition in self._store.definition.steps]
        return ChecklistResponse(
            checklist_id=self._store.definition.checklist_id,
            version=self._store.definition.version,
            definition_changed=definition_changed,
            override_pending=state.override_pending,
            steps=steps,
            locale_approval=self._build_locale_payload(locale_status),
        )

    async def update_step_status(
        self,
        user_id: UUID,
        workspace_id: UUID,
        step_id: str,
        payload: StepStatusRequest,
        *,
        locale: str | None = None,
    ) -> ChecklistStepProgress:
        step_definition = self._store.get_step_definition(step_id)
        self.ensure_locale_approved(locale)
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

    def _build_step(
        self,
        definition: StepDefinition,
        state: UserChecklistState,
        locale_status: LocaleApprovalStatus,
    ) -> ChecklistStep:
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
            disclosure_text = definition.disclosure_copy or ""
            if not locale_status.approved:
                disclosure_text = locale_status.message
            payload["disclosure"] = {
                "text": disclosure_text,
                "acknowledgementToken": definition.acknowledgement_token,
            }
        if definition.requires_template_edit:
            templates = [
                {
                    "templateId": template.template_id,
                    "title": template.title,
                    "description": template.description,
                    "estimatedRunTime": f"≤{template.estimated_run_time_minutes} min",
                    "defaultParameters": template.default_parameters,
                    "reactFlow": template.react_flow_schema,
                }
                for template in self._catalog.list()
            ]
            payload["templates"] = templates
            payload["templatesAvailable"] = self._catalog.is_available()
        payload["overridePending"] = record.override_pending or state.override_pending
        if record.override_reason:
            payload["overrideReason"] = record.override_reason
        if record.override_actor_role:
            payload["overrideActorRole"] = record.override_actor_role
        return ChecklistStep.model_validate(payload)

    def get_locale_status(self, locale: str | None = None) -> LocaleApprovalStatus:
        normalized = (locale or DEFAULT_LOCALE).strip() or DEFAULT_LOCALE
        return self._locale_registry.get_status(normalized)

    def ensure_locale_approved(self, locale: str | None = None) -> LocaleApprovalStatus:
        status = self.get_locale_status(locale)
        self._ensure_locale_approved(status)
        return status

    def _build_locale_payload(self, status: LocaleApprovalStatus) -> dict[str, Any]:
        return {
            "locale": status.locale,
            "status": status.status,
            "approved": status.approved,
            "message": status.message,
            "reviewer": status.reviewer,
            "role": status.role,
            "decisionDate": status.decision_date,
            "evidenceLink": status.evidence_link or DEFAULT_EVIDENCE_LINK,
        }

    def _ensure_locale_approved(self, status: LocaleApprovalStatus) -> None:
        if status.approved:
            return
        context: dict[str, Any] = {
            "locale": status.locale,
            "evidenceLink": status.evidence_link or DEFAULT_EVIDENCE_LINK,
            "message": status.message,
        }
        if status.reviewer:
            context["reviewer"] = status.reviewer
        if status.role:
            context["role"] = status.role
        if status.decision_date:
            context["decisionDate"] = status.decision_date
        raise ChecklistConflictError(
            "Locale disclosures pending legal approval",
            code="locale_unapproved",
            context=context,
        )

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
    def __init__(
        self,
        store: ChecklistStateStore | None = None,
        catalog: TemplateCatalog | None = None,
        forwarder: TelemetryForwarder | None = None,
        locale_registry: LocaleApprovalRegistry | None = None,
    ) -> None:
        self._store = store or GLOBAL_STORE
        self._catalog = catalog or get_template_catalog()
        self._forwarder = forwarder or TelemetryForwarder()
        self._locale_registry = locale_registry or get_locale_registry()
        self._checklist_service = ChecklistService(
            self._store,
            catalog=self._catalog,
            locale_registry=self._locale_registry,
        )

    async def select_template(
        self,
        user_id: UUID,
        workspace_id: UUID,
        template_id: UUID,
        payload: TemplateSelectRequest,
        *,
        locale: str | None = None,
    ) -> TemplateSelectResponse:
        if not self._catalog.is_available():
            raise ChecklistConflictError("Starter templates are temporarily unavailable")

        try:
            template = self._catalog.get(template_id)
        except LookupError as exc:
            raise ChecklistNotFoundError(str(exc)) from exc

        sanitized_diff = self._sanitize_parameter_changes(template, payload.parameter_changes)
        status_request = StepStatusRequest(
            status=StepStatus.COMPLETED,
            template_diff=sanitized_diff,
        )

        await self._checklist_service.update_step_status(
            user_id,
            workspace_id,
            "select_template",
            status_request,
            locale=locale,
        )

        checklist = await self._checklist_service.fetch_checklist(user_id, workspace_id, locale=locale)
        step = next((item for item in checklist.steps if item.step_id == "select_template"), None)
        if step is None:
            raise ChecklistNotFoundError("select_template step unavailable")

        draft_strategy_id = uuid5(
            DRAFT_NAMESPACE,
            f"draft:{user_id}:{workspace_id}:{template.template_id}",
        )

        template_event = TelemetryEvent(
            event_type=TelemetryEventType.TEMPLATE_SELECTED,
            step_id="select_template",
            template_id=template.template_id,
            metadata={
                "userId": str(user_id),
                "workspaceId": str(workspace_id),
                "templateTitle": template.title,
                "parameterChanges": sanitized_diff,
                "canvasContext": payload.canvas_context,
            },
        )
        self._forwarder.forward(template_event)

        return TemplateSelectResponse(
            draft_strategy_id=draft_strategy_id,
            checklist_step=step,
            templates_available=self._catalog.is_available(),
        )

    def _sanitize_parameter_changes(
        self,
        template: StarterTemplateDefinition,
        diff: dict[str, Any] | None,
    ) -> dict[str, Any]:
        if not isinstance(diff, Mapping):
            raise ChecklistConflictError("Parameter changes required before saving a template")

        sanitized: dict[str, Any] = {}
        for key, value in diff.items():
            if key in {"__proto__", "constructor"}:
                raise ChecklistConflictError("Invalid parameter key provided")
            if key not in template.default_parameters:
                raise ChecklistConflictError(f"Parameter '{key}' is not editable")

            default_value = template.default_parameters[key]
            normalised = self._coerce_value(default_value, value)
            if normalised == default_value:
                continue
            sanitized[key] = normalised

        if not sanitized:
            raise ChecklistConflictError("Parameter changes required before saving a template")

        return sanitized

    def _coerce_value(self, expected: Any, provided: Any) -> Any:
        if isinstance(expected, (int, float)):
            return self._coerce_numeric_value(expected, provided)
        if isinstance(expected, str):
            return self._coerce_string_value(provided)
        if isinstance(expected, bool):
            return self._coerce_boolean_value(provided)

        if isinstance(provided, (dict, list)):
            raise ChecklistConflictError("Complex parameter payloads are not supported")

        return provided

    def _coerce_numeric_value(self, expected: int | float, provided: Any) -> int | float:
        if isinstance(provided, (int, float)):
            return type(expected)(provided)
        if isinstance(provided, str):
            try:
                parsed = float(provided) if isinstance(expected, float) else int(float(provided))
            except ValueError as exc:
                raise ChecklistConflictError("Parameter value must be numeric") from exc
            return type(expected)(parsed)
        raise ChecklistConflictError("Parameter value must be numeric")

    def _coerce_string_value(self, provided: Any) -> str:
        if not isinstance(provided, str):
            raise ChecklistConflictError("Parameter value must be a string")
        return provided.strip()

    def _coerce_boolean_value(self, provided: Any) -> bool:
        if isinstance(provided, bool):
            return provided
        if isinstance(provided, str):
            lowered = provided.lower()
            if lowered in {"true", "1", "yes"}:
                return True
            if lowered in {"false", "0", "no"}:
                return False
        raise ChecklistConflictError("Parameter value must be a boolean")


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
    _DEDUP_TYPES: ClassVar[set[TelemetryEventType]] = {
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
    "ChecklistConflictError",
    "ChecklistNotFoundError",
    "ChecklistService",
    "ChecklistServiceProtocol",
    "OverrideService",
    "OverrideServiceProtocol",
    "TelemetryService",
    "TelemetryServiceProtocol",
    "TemplateSelectionService",
    "TemplateSelectionServiceProtocol",
    "reset_onboarding_state",
]
