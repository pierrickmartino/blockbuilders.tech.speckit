from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import replace
from http import HTTPStatus
from uuid import UUID

from app.api.onboarding import router as onboarding_router
from app.dependencies.supabase import get_current_supabase_user
from app.factory import create_app
from app.schemas.auth import SupabaseUserProfile
from app.schemas.onboarding import StepStatus
from app.services.onboarding import ChecklistService, OverrideService, reset_onboarding_state
from app.services.onboarding.service import ChecklistStateStore

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport

USER_ID = UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
WORKSPACE_ID = UUID("bbbbbbbb-cccc-dddd-eeee-ffffffffffff")


@pytest.fixture(autouse=True)
def _reset_state() -> None:
    reset_onboarding_state()


@pytest.fixture()
def checklist_store() -> ChecklistStateStore:
    return ChecklistStateStore()


@pytest_asyncio.fixture()
async def onboarding_client(checklist_store: ChecklistStateStore) -> AsyncIterator[httpx.AsyncClient]:
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
    app.dependency_overrides[onboarding_router.get_override_service] = lambda: OverrideService(checklist_store)

    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client


async def _fetch_checklist(client: httpx.AsyncClient) -> dict:
    response = await client.get("/onboarding/checklist")
    response.raise_for_status()
    return response.json()


async def _update_step(
    client: httpx.AsyncClient,
    step_id: str,
    *,
    status: StepStatus,
    acknowledgement_token: str | None = None,
    template_diff: dict | None = None,
) -> httpx.Response:
    payload = {
        "status": status.value,
        "acknowledgementToken": acknowledgement_token,
        "templateDiff": template_diff,
    }
    return await client.post(f"/onboarding/steps/{step_id}/status", json=payload)


@pytest.mark.asyncio
async def test_fetch_checklist_returns_active_steps(onboarding_client: httpx.AsyncClient) -> None:
    payload = await _fetch_checklist(onboarding_client)

    assert payload["checklistId"] == "00000000-0000-0000-0000-000000000004"
    assert payload["version"] >= 1
    assert payload["definitionChanged"] is False
    assert payload["overridePending"] is False
    steps = payload["steps"]
    assert len(steps) >= 4
    first_step = steps[0]
    assert first_step["stepId"] == "disclosures"
    assert first_step["requiresDisclosure"] is True
    assert first_step["status"] == StepStatus.NOT_STARTED.value
    assert first_step["disclosure"]["acknowledgementToken"]


@pytest.mark.asyncio
async def test_step_completion_persists_between_requests(onboarding_client: httpx.AsyncClient) -> None:
    checklist = await _fetch_checklist(onboarding_client)
    disclosure_step = checklist["steps"][0]
    ack_token = disclosure_step["disclosure"]["acknowledgementToken"]

    complete = await _update_step(
        onboarding_client,
        "disclosures",
        status=StepStatus.COMPLETED,
        acknowledgement_token=ack_token,
    )
    assert complete.status_code == HTTPStatus.OK

    follow_up = await _fetch_checklist(onboarding_client)
    statuses = {step["stepId"]: step["status"] for step in follow_up["steps"]}
    assert statuses["disclosures"] == StepStatus.COMPLETED.value
    assert statuses["connect_data"] == StepStatus.NOT_STARTED.value


@pytest.mark.asyncio
async def test_missing_disclosure_ack_returns_conflict(onboarding_client: httpx.AsyncClient) -> None:
    response = await _update_step(
        onboarding_client,
        "disclosures",
        status=StepStatus.COMPLETED,
        acknowledgement_token=None,
    )

    assert response.status_code == HTTPStatus.CONFLICT
    assert response.json()["detail"].startswith("Disclosure acknowledgement required")


@pytest.mark.asyncio
async def test_template_step_requires_diff(onboarding_client: httpx.AsyncClient) -> None:
    checklist = await _fetch_checklist(onboarding_client)
    disclosure_step = checklist["steps"][0]
    ack_token = disclosure_step["disclosure"]["acknowledgementToken"]
    # Complete prerequisite steps first.
    await _update_step(
        onboarding_client,
        "disclosures",
        status=StepStatus.COMPLETED,
        acknowledgement_token=ack_token,
    )
    await _update_step(
        onboarding_client,
        "connect_data",
        status=StepStatus.COMPLETED,
    )

    response = await _update_step(
        onboarding_client,
        "select_template",
        status=StepStatus.COMPLETED,
        template_diff=None,
    )

    assert response.status_code == HTTPStatus.CONFLICT
    assert "template edit" in response.json()["detail"]

    success = await _update_step(
        onboarding_client,
        "select_template",
        status=StepStatus.COMPLETED,
        template_diff={"risk": "medium"},
    )
    assert success.status_code == HTTPStatus.OK


@pytest.mark.asyncio
async def test_step_completion_response_matches_schema(onboarding_client: httpx.AsyncClient) -> None:
    checklist = await _fetch_checklist(onboarding_client)
    disclosure_step = checklist["steps"][0]
    ack_token = disclosure_step["disclosure"]["acknowledgementToken"]

    response = await _update_step(
        onboarding_client,
        "disclosures",
        status=StepStatus.COMPLETED,
        acknowledgement_token=ack_token,
    )
    payload = response.json()

    assert response.status_code == HTTPStatus.OK
    assert UUID(payload["progressId"])
    assert payload["stepId"] == "disclosures"
    assert payload["status"] == StepStatus.COMPLETED.value
    assert isinstance(payload["completedAt"], str)


@pytest.mark.asyncio
async def test_cannot_skip_ahead_without_completing_previous_steps(onboarding_client: httpx.AsyncClient) -> None:
    response = await _update_step(
        onboarding_client,
        "connect_data",
        status=StepStatus.COMPLETED,
    )

    assert response.status_code == HTTPStatus.CONFLICT
    detail = response.json()["detail"]
    assert "Cannot complete" in detail
    assert "disclosures" in detail


@pytest.mark.asyncio
async def test_definition_change_sets_flag_and_resets_progress(
    onboarding_client: httpx.AsyncClient,
    checklist_store: ChecklistStateStore,
) -> None:
    checklist = await _fetch_checklist(onboarding_client)
    disclosure_step = checklist["steps"][0]
    ack_token = disclosure_step["disclosure"]["acknowledgementToken"]

    await _update_step(
        onboarding_client,
        "disclosures",
        status=StepStatus.COMPLETED,
        acknowledgement_token=ack_token,
    )

    checklist_store._definition = replace(  # type: ignore[attr-defined]
        checklist_store.definition,
        version=checklist_store.definition.version + 1,
    )

    updated = await _fetch_checklist(onboarding_client)
    statuses = {step["stepId"]: step["status"] for step in updated["steps"]}

    assert updated["definitionChanged"] is True
    assert all(status == StepStatus.NOT_STARTED.value for status in statuses.values())

    second_fetch = await _fetch_checklist(onboarding_client)
    assert second_fetch["definitionChanged"] is False


@pytest.mark.asyncio
async def test_override_marks_steps_complete_and_records_reason(
    onboarding_client: httpx.AsyncClient,
    checklist_store: ChecklistStateStore,
) -> None:
    payload = {
        "userId": str(USER_ID),
        "workspaceId": str(WORKSPACE_ID),
        "reason": "Manual approval from support",
        "actorId": str(USER_ID),
        "actorRole": "teammate",
    }

    response = await onboarding_client.post("/onboarding/overrides/mark-as-done", json=payload)
    assert response.status_code == HTTPStatus.ACCEPTED

    updated = await _fetch_checklist(onboarding_client)
    assert all(step["status"] == StepStatus.COMPLETED.value for step in updated["steps"])

    state, _ = checklist_store.get_or_create_state(USER_ID, WORKSPACE_ID)
    record = state.steps["disclosures"]
    assert record.override_reason == "Manual approval from support"
    assert record.completed_by == USER_ID
