from __future__ import annotations

from collections.abc import AsyncIterator
from http import HTTPStatus
from uuid import UUID

from app.api.onboarding import router as onboarding_router
from app.dependencies.supabase import get_current_supabase_user
from app.factory import create_app
from app.schemas.auth import SupabaseUserProfile
from app.schemas.onboarding import StepStatus
from app.services.onboarding import ChecklistService, reset_onboarding_state
from app.services.onboarding.service import ChecklistStateStore

import httpx
import pytest
import pytest_asyncio
from httpx import ASGITransport

USER_ID = UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
WORKSPACE_ID = UUID("bbbbbbbb-cccc-dddd-eeee-ffffffffffff")
LOCALE = "de-DE"


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
            email="pending-locale@example.com",
            email_confirmed_at="2025-11-12T00:00:00Z",
            last_sign_in_at="2025-11-12T00:00:00Z",
            metadata={"workspace_id": str(WORKSPACE_ID), "locale": LOCALE},
        )

    app.dependency_overrides[get_current_supabase_user] = _stub_user
    app.dependency_overrides[onboarding_router.get_checklist_service] = lambda: ChecklistService(checklist_store)

    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client


async def _fetch_checklist(client: httpx.AsyncClient) -> dict:
    response = await client.get("/onboarding/checklist")
    response.raise_for_status()
    return response.json()


@pytest.mark.asyncio
async def test_fetch_checklist_reports_pending_locale(onboarding_client: httpx.AsyncClient) -> None:
    payload = await _fetch_checklist(onboarding_client)
    locale_status = payload.get("localeApproval")

    assert isinstance(locale_status, dict)
    assert locale_status.get("locale") == LOCALE
    assert locale_status.get("approved") is False
    assert "docs/qa/onboarding-checklist.md" in str(locale_status.get("evidenceLink", ""))


@pytest.mark.asyncio
async def test_step_update_returns_conflict_for_pending_locale(onboarding_client: httpx.AsyncClient) -> None:
    response = await onboarding_client.post(
        "/onboarding/steps/disclosures/status",
        json={
            "status": StepStatus.COMPLETED.value,
            "acknowledgementToken": "ack-risk-statement-v1",
        },
    )

    assert response.status_code == HTTPStatus.CONFLICT
    detail = response.json().get("detail")
    assert isinstance(detail, dict)
    assert detail.get("code") == "locale_unapproved"
    context = detail.get("context", {})
    assert context.get("locale") == LOCALE
