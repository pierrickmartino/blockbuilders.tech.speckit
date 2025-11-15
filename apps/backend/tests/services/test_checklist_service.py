from __future__ import annotations

from dataclasses import replace
from uuid import UUID

import pytest

from app.schemas.onboarding import OverrideRequest, StepStatus, StepStatusRequest, TelemetryEvent, TelemetryEventType
from app.services.onboarding import ChecklistConflictError, OverrideService
from app.services.onboarding.service import ChecklistService, ChecklistStateStore, OverrideService, TelemetryService
from app.services.telemetry_forwarder import TelemetryForwarder

USER_ID = UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
WORKSPACE_ID = UUID("bbbbbbbb-cccc-dddd-eeee-ffffffffffff")


class RecordingForwarder(TelemetryForwarder):
    def __init__(self) -> None:
        super().__init__()
        self.events: list[TelemetryEvent] = []

    def forward(self, event: TelemetryEvent):  # type: ignore[override]
        self.events.append(event)
        return {"ok": True}


def _build_service() -> tuple[ChecklistService, ChecklistStateStore]:
    store = ChecklistStateStore()
    return ChecklistService(store), store


@pytest.mark.asyncio
async def test_step_completion_is_idempotent() -> None:
    service, store = _build_service()
    disclosures = store.get_step_definition("disclosures")

    payload = StepStatusRequest(
        status=StepStatus.COMPLETED,
        acknowledgement_token=disclosures.acknowledgement_token,
    )

    first = await service.update_step_status(USER_ID, WORKSPACE_ID, "disclosures", payload)
    second = await service.update_step_status(USER_ID, WORKSPACE_ID, "disclosures", payload)

    assert second.completed_at == first.completed_at
    assert second.status == StepStatus.COMPLETED


@pytest.mark.asyncio
async def test_template_diff_is_persisted_once() -> None:
    service, _ = _build_service()

    ack_payload = StepStatusRequest(status=StepStatus.COMPLETED, acknowledgement_token="ack-risk-statement-v1")
    await service.update_step_status(USER_ID, WORKSPACE_ID, "disclosures", ack_payload)
    await service.update_step_status(USER_ID, WORKSPACE_ID, "connect_data", StepStatusRequest(status=StepStatus.COMPLETED))

    diff_payload = StepStatusRequest(status=StepStatus.COMPLETED, template_diff={"risk": "medium"})
    first = await service.update_step_status(USER_ID, WORKSPACE_ID, "select_template", diff_payload)
    repeat = await service.update_step_status(USER_ID, WORKSPACE_ID, "select_template", diff_payload)

    assert repeat.completed_at == first.completed_at
    assert repeat.status == StepStatus.COMPLETED


@pytest.mark.asyncio
async def test_telemetry_events_are_deduplicated_per_version() -> None:
    store = ChecklistStateStore()
    forwarder = RecordingForwarder()
    telemetry = TelemetryService(forwarder=forwarder, store=store)

    event = TelemetryEvent(event_type=TelemetryEventType.STEP_COMPLETE, step_id="disclosures")

    await telemetry.record_event(USER_ID, WORKSPACE_ID, event)
    await telemetry.record_event(USER_ID, WORKSPACE_ID, event)
    assert len(forwarder.events) == 1

    store._definition = replace(store.definition, version=store.definition.version + 1)
    await telemetry.record_event(USER_ID, WORKSPACE_ID, event)
    assert len(forwarder.events) == 2


@pytest.mark.asyncio
async def test_different_steps_emit_unique_events() -> None:
    store = ChecklistStateStore()
    forwarder = RecordingForwarder()
    telemetry = TelemetryService(forwarder=forwarder, store=store)

    await telemetry.record_event(
        USER_ID,
        WORKSPACE_ID,
        TelemetryEvent(event_type=TelemetryEventType.STEP_COMPLETE, step_id="disclosures"),
    )
    await telemetry.record_event(
        USER_ID,
        WORKSPACE_ID,
        TelemetryEvent(event_type=TelemetryEventType.STEP_COMPLETE, step_id="connect_data"),
    )

    assert len(forwarder.events) == 2


@pytest.mark.asyncio
async def test_override_requires_confirmation_token() -> None:
    store = ChecklistStateStore()
    service = OverrideService(store)

    invalid_payload = OverrideRequest(
        user_id=USER_ID,
        workspace_id=WORKSPACE_ID,
        reason="Support override required",
        actor_id=USER_ID,
        actor_role="teammate",
        confirmation_token="invalid-token",
    )

    with pytest.raises(ChecklistConflictError):
        await service.mark_as_done(invalid_payload)

    invalid_payload.confirmation_token = "override.confirmed.v1"
    await service.mark_as_done(invalid_payload)
    state, _ = store.get_or_create_state(USER_ID, WORKSPACE_ID)
    assert state.override_pending is True


@pytest.mark.asyncio
async def test_backtest_success_clears_override_pending() -> None:
    store = ChecklistStateStore()
    overrides = OverrideService(store)
    telemetry = TelemetryService(store=store, forwarder=RecordingForwarder())

    payload = OverrideRequest(
        user_id=USER_ID,
        workspace_id=WORKSPACE_ID,
        reason="Support override required",
        actor_id=USER_ID,
        actor_role="teammate",
        confirmation_token="override.confirmed.v1",
    )

    await overrides.mark_as_done(payload)
    state, _ = store.get_or_create_state(USER_ID, WORKSPACE_ID)
    assert state.override_pending is True

    await telemetry.record_event(
        USER_ID,
        WORKSPACE_ID,
        TelemetryEvent(event_type=TelemetryEventType.BACKTEST_SUCCESS, step_id="run_backtest"),
    )

    state, _ = store.get_or_create_state(USER_ID, WORKSPACE_ID)
    assert state.override_pending is False
