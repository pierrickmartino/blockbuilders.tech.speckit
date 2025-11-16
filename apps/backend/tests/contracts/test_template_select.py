from __future__ import annotations

from collections.abc import AsyncIterator
from http import HTTPStatus
from uuid import UUID

from app.api.onboarding import router as onboarding_router
from app.dependencies.supabase import get_current_supabase_user
from app.factory import create_app
from app.schemas.auth import SupabaseUserProfile
from app.schemas.onboarding import StepStatus, TelemetryEvent
from app.services.onboarding import (
    ChecklistService,
    TemplateSelectionService,
    reset_onboarding_state,
)
from app.services.onboarding.service import ChecklistStateStore

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport

USER_ID = UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
WORKSPACE_ID = UUID("bbbbbbbb-cccc-dddd-eeee-ffffffffffff")
TEMPLATE_ID = UUID("00000000-0000-0000-0000-00000000a11a")


class CaptureForwarder:
    def __init__(self) -> None:
        self.events: list[TelemetryEvent] = []

    def forward(self, event: TelemetryEvent) -> dict[str, object]:
        self.events.append(event)
        return {"eventType": event.event_type.value}


@pytest.fixture(autouse=True)
def _reset_state() -> None:
    reset_onboarding_state()


@pytest.fixture()
def checklist_store() -> ChecklistStateStore:
    return ChecklistStateStore()


@pytest.fixture()
def capture_forwarder() -> CaptureForwarder:
    return CaptureForwarder()


@pytest_asyncio.fixture()
async def onboarding_client(
    checklist_store: ChecklistStateStore,
    capture_forwarder: CaptureForwarder,
) -> AsyncIterator[httpx.AsyncClient]:
    app = create_app()

    def _stub_user() -> SupabaseUserProfile:
        return SupabaseUserProfile(
            id=USER_ID,
            email="onboarder@example.com",
            email_confirmed_at="2025-11-12T00:00:00Z",
            last_sign_in_at="2025-11-12T00:00:00Z",
            metadata={"workspace_id": str(WORKSPACE_ID)},
        )

    app.dependency_overrides[get_current_supabase_user] = _stub_user
    app.dependency_overrides[onboarding_router.get_checklist_service] = lambda: ChecklistService(checklist_store)
    app.dependency_overrides[onboarding_router.get_template_service] = lambda: TemplateSelectionService(
        store=checklist_store,
        forwarder=capture_forwarder,
    )

    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client


def _selection_payload(diff: dict[str, object] | None) -> dict[str, object]:
    payload: dict[str, object] = {
        "parameterChanges": diff or {},
        "draftName": "Momentum kickstart",
        "canvasContext": {
            "nodes": [{"id": "1", "position": {"x": 0, "y": 0}, "data": {"label": "Entry"}}],
            "edges": [],
        },
    }
    return payload


async def _complete_foundational_steps(client: httpx.AsyncClient) -> None:
    checklist = await client.get("/onboarding/checklist")
    checklist.raise_for_status()
    steps = checklist.json()["steps"]
    disclosure = steps[0]
    ack_token = disclosure.get("disclosure", {}).get("acknowledgementToken", "ack-risk-statement-v1")

    await client.post(
        "/onboarding/steps/disclosures/status",
        json={
            "status": StepStatus.COMPLETED.value,
            "acknowledgementToken": ack_token,
        },
    )
    await client.post(
        "/onboarding/steps/connect_data/status",
        json={"status": StepStatus.COMPLETED.value},
    )


@pytest.mark.asyncio
async def test_template_selection_requires_parameter_changes(onboarding_client: httpx.AsyncClient) -> None:
    await _complete_foundational_steps(onboarding_client)
    response = await onboarding_client.post(
        f"/onboarding/templates/{TEMPLATE_ID}/select",
        json=_selection_payload(diff={}),
    )

    assert response.status_code == HTTPStatus.CONFLICT
    assert "parameter" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_template_selection_returns_draft_and_updates_progress(
    onboarding_client: httpx.AsyncClient,
) -> None:
    await _complete_foundational_steps(onboarding_client)
    response = await onboarding_client.post(
        f"/onboarding/templates/{TEMPLATE_ID}/select",
        json=_selection_payload(diff={"riskTolerance": "balanced"}),
    )

    assert response.status_code == HTTPStatus.CREATED
    payload = response.json()
    assert UUID(payload["draftStrategyId"])
    checklist_step = payload["checklistStep"]
    assert checklist_step["stepId"] == "select_template"
    assert checklist_step["status"] == StepStatus.COMPLETED.value
    assert checklist_step.get("templatesAvailable") is True
    assert isinstance(checklist_step.get("templates"), list)
    assert len(checklist_step["templates"]) >= 1

    # Subsequent checklist fetch should persist the completed status.
    follow_up = await onboarding_client.get("/onboarding/checklist")
    follow_up.raise_for_status()
    statuses = {step["stepId"]: step["status"] for step in follow_up.json()["steps"]}
    assert statuses["select_template"] == StepStatus.COMPLETED.value


@pytest.mark.asyncio
async def test_template_selection_emits_template_selected_event(
    onboarding_client: httpx.AsyncClient,
    capture_forwarder: CaptureForwarder,
) -> None:
    await _complete_foundational_steps(onboarding_client)
    response = await onboarding_client.post(
        f"/onboarding/templates/{TEMPLATE_ID}/select",
        json=_selection_payload(diff={"riskTolerance": "balanced"}),
    )
    assert response.status_code == HTTPStatus.CREATED

    events = [event.event_type.value for event in capture_forwarder.events]
    assert "template_selected" in events
