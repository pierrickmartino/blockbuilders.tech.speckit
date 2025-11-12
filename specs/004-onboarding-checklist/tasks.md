---
description: "Task list for 004-onboarding-checklist"
---

# Tasks: Onboarding & First-Run Checklist

**Input**: Design documents from `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/specs/004-onboarding-checklist/`
**Prerequisites**: `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/specs/004-onboarding-checklist/plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: Constitution requires failing-first tests (vitest, Playwright, pytest, Datadog contract checks). Only include tests requested per story.

**Organization**: Tasks are grouped by user story (US1–US3) so each increment is independently testable.

**Quality Gates**: Enforce `pnpm lint --max-warnings 0`, `pnpm type-check`, `pnpm test:coverage`, Playwright accessibility, `ruff check`, `uv run pytest`, Datadog dashboard validation, analytics contract tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Task can run in parallel (isolated files, no upstream dependencies)
- **[Story]**: User story label (US1, US2, US3). Setup, Foundational, and Polish tasks omit the story label.
- Include absolute file paths in every description.

## Path Conventions

- Frontend: `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/**`
- Backend: `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/**`
- Config/docs/specs: `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/{configs,docs,specs}/**`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare local tooling, secrets, and fixtures before feature work.

- [ ] T001 Install workspace Node dependencies via `pnpm install` at `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit`
- [ ] T002 [P] Sync backend Python environment via `uv sync` at `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend`
- [ ] T003 Configure Supabase + Datadog secrets in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/.env.local` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/.env`
- [ ] T004 Seed onboarding fixtures using `pnpm --filter @blockbuilders/frontend run db:seed onboarding-checklist` and `uv run python /Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/scripts/seed_onboarding.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create shared schema and typing scaffolds that every user story consumes.

- [ ] T005 Author onboarding core migration for `OnboardingChecklist` + `ChecklistStepProgress` tables in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/db/migrations/004_onboarding_core.sql`
- [ ] T006 [P] Create template storage migration ( `StarterTemplate`, `StarterTemplateSelection`) with indexes in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/db/migrations/004_onboarding_templates.sql`
- [ ] T007 [P] Create telemetry migration for `OnboardingEvent` table + `FunnelMetricSnapshot` materialized view + Supabase cron stub in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/db/migrations/004_onboarding_events.sql`
- [ ] T008 Define RLS policies + support override grants for all onboarding tables in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/db/policies/onboarding_checklist.sql`
- [ ] T009 [P] Publish shared TypeScript + Zod schemas for onboarding entities/events in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/types/onboarding.ts` and re-export via `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/lib/supabase/types.ts`
- [ ] T010 [P] Publish backend Pydantic models (ChecklistResponse, StepStatusUpdate, TemplateSelectionResponse, OnboardingEvent, FunnelMetric) in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/schemas/onboarding.py`

**Checkpoint**: Database artifacts, shared typing, and security policies are in place; user stories can now begin.

---

## Phase 3: User Story 1 – Finish the guided checklist (Priority: P1) 🎯 MVP

**Goal**: Deliver a four-step guided checklist whose completion persists per user/workspace and is accessible on first sign-in.

**Independent Test**: Create a new workspace, complete steps in and out of order, refresh/re-login, and confirm state persists with focus returning to the next incomplete step.

### Tests for User Story 1 (write first)

- [ ] T011 [P] [US1] Add backend contract/integration tests for `GET /onboarding/checklist` and `POST /onboarding/steps/{stepId}/status` aligned with `contracts/onboarding.yaml` in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/tests/integration/test_onboarding_checklist.py`
- [ ] T012 [P] [US1] Add vitest reducer/state-machine tests covering out-of-order completion + persistence in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/tests/onboarding/checklist-state.spec.ts`
- [ ] T013 [P] [US1] Add Playwright accessibility + persistence flow for the checklist modal in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/tests/onboarding/checklist.e2e.ts`

### Implementation for User Story 1

- [ ] T014 [US1] Implement Supabase repository + service functions for checklist reads/writes and idempotent progress updates in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/services/onboarding/checklist.py`
- [ ] T015 [US1] Implement FastAPI routes for `/onboarding/checklist`, `/onboarding/steps/{stepId}/status`, and `/onboarding/events` in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/api/routes/onboarding.py` using the new schemas
- [ ] T016 [US1] Register the onboarding router + telemetry hooks in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/main.py` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/api/__init__.py`
- [ ] T017 [US1] Create Next.js route handlers + server actions in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/app/api/onboarding/route.ts` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/app/api/onboarding/steps/[stepId]/route.ts` that proxy to FastAPI and call `revalidateTag('onboarding-checklist')`
- [ ] T018 [US1] Implement checklist state machine + optimistic update helpers using `useOptimistic` + Supabase writes in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/lib/onboarding/checklist-machine.ts`
- [ ] T019 [P] [US1] Build accessible checklist UI primitives (Dialog shell, Step card, Progress meter, disclosure modal) inside `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/components/onboarding/`
- [ ] T020 [US1] Integrate the modal launcher + data prefetch into `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/app/(protected)/dashboard/page.tsx` with focus trapping + feature flag controls
- [ ] T021 [P] [US1] Emit onboarding telemetry (view, step_start, step_complete, disclosure_ack) via `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/lib/telemetry/onboarding.ts` calling the backend `/onboarding/events` endpoint

**Checkpoint**: Checklist UI, persistence, and telemetry work end-to-end for first-time users.

---

## Phase 4: User Story 2 – Prime a draft strategy via starter templates (Priority: P2)

**Goal**: Allow users to pick a starter template from the checklist, prime the React Flow canvas, and immediately run/edit the draft strategy.

**Independent Test**: From the checklist modal, select each template; confirm the canvas loads with template nodes/edges, defaults stay editable, and a backtest runs without validation errors.

### Tests for User Story 2 (write first)

- [ ] T022 [P] [US2] Add backend integration test for `POST /onboarding/templates/{templateId}/select` covering happy path + template missing in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/tests/integration/test_onboarding_templates.py`
- [ ] T023 [P] [US2] Add vitest coverage for `TemplatePrimingContext` + React Flow reducer in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/tests/onboarding/template-priming.spec.ts`
- [ ] T024 [P] [US2] Extend Playwright flow in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/tests/onboarding/template-selection.e2e.ts` to verify keyboard navigation + canvas priming success banner

### Implementation for User Story 2

- [ ] T025 [US2] Implement template repository/service persisting `StarterTemplateSelection` + linking checklist progress in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/services/onboarding/templates.py`
- [ ] T026 [US2] Extend `/onboarding/templates/{templateId}/select` route inside `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/api/routes/onboarding.py` to return React Flow payloads + error reasons
- [ ] T027 [US2] Create `TemplatePrimingContext`, React Flow dynamic import helper, and success/failure dispatchers in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/lib/onboarding/template-priming.ts`
- [ ] T028 [P] [US2] Build template gallery + CTA components (cards, metadata badges, disclosures) in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/components/onboarding/TemplateGallery.tsx`
- [ ] T029 [US2] Integrate template step CTAs with React Flow canvas launch inside `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/components/onboarding/ChecklistDialog.tsx` and the dashboard page to open the primed draft
- [ ] T030 [US2] Add Next.js route handler for template selection at `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/app/api/onboarding/templates/[templateId]/route.ts` to call FastAPI, persist Supabase metadata, and handle empty-template fallbacks

**Checkpoint**: Template selection primes the canvas and marks the checklist step complete only after React Flow confirms success.

---

## Phase 5: User Story 3 – Monitor funnel conversion (Priority: P3)

**Goal**: Provide analytics stakeholders with funnel dashboards and cohort filters showing step completion, drop-off rates, and timing.

**Independent Test**: Ingest sample onboarding events, query the funnel endpoint, and confirm metrics + cohort filters match Datadog dashboard visualizations.

### Tests for User Story 3 (write first)

- [ ] T031 [P] [US3] Add backend integration test for `GET /analytics/onboarding-funnel` using seed data in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/tests/integration/test_onboarding_analytics.py`
- [ ] T032 [P] [US3] Add pytest covering funnel aggregation + drop-off highlighting in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/tests/unit/test_funnel_aggregator.py`
- [ ] T033 [P] [US3] Add unit test to verify Datadog dashboard JSON schema + required widgets in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/tests/unit/test_datadog_onboarding_dashboard.py`

### Implementation for User Story 3

- [ ] T034 [US3] Implement analytics service querying `FunnelMetricSnapshot` + cohort filters in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/services/onboarding/analytics.py`
- [ ] T035 [US3] Add `/analytics/onboarding-funnel` FastAPI route with caching + query validation in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/api/routes/analytics.py`
- [ ] T036 [US3] Schedule Supabase cron + refresh job SQL in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/db/migrations/004_onboarding_funnel_cron.sql` to backfill `FunnelMetricSnapshot`
- [ ] T037 [US3] Create Datadog dashboard + alert config JSON in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/configs/observability/datadog/onboarding-funnel.json` and register via deployment scripts
- [ ] T038 [US3] Document analytics validation + sample cohort queries in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/docs/analytics/onboarding-funnel.md`

**Checkpoint**: Cohort-ready funnel metrics are queryable via API and surfaced in Datadog dashboards with alerting.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Harden accessibility/performance, finalize docs, and ensure gates are met.

- [ ] T039 [P] Add onboarding-specific accessibility + performance checks to `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/playwright.config.ts`
- [ ] T040 Update `quickstart.md` with new template selection + analytics verification steps at `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/specs/004-onboarding-checklist/quickstart.md`
- [ ] T041 Record release notes + known limitations in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/docs/releases/004-onboarding-checklist.md`
- [ ] T042 Run and capture constitution gates (`pnpm lint`, `pnpm type-check`, `pnpm test:coverage`, `uv run pytest`, `ruff check`) from `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit` and attach logs to the PR

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **US1 (Phase 3)** → **US2 (Phase 4)** → **US3 (Phase 5)** → **Polish (Phase 6)**
- User Story dependencies: US2 depends on US1 service contracts, US3 depends on telemetry emitted by US1/US2. Completion order: US1 → US2 → US3.
- Task graph highlights: T005–T010 must complete before T011; T017/T030 depend on corresponding FastAPI routes (T015/T026); analytics tasks T034–T038 depend on telemetry migration T007 + cron T036.

## Parallel Execution Examples

### User Story 1 (Checklist)
- Run tests T011–T013 concurrently while backend services (T014) and frontend UI (T019) proceed.
- After services are ready, T017 (route handlers) and T021 (telemetry) can run in parallel.

### User Story 2 (Template Priming)
- Execute tests T022–T024 simultaneously before backend template service T025 completes.
- Frontend tasks T028 and T029 can proceed in parallel once TemplatePrimingContext (T027) exists.

### User Story 3 (Analytics Dashboard)
- Tests T031–T033 can run concurrently using seeded data.
- Dashboard config (T037) and documentation (T038) may proceed in parallel once the analytics service (T034) exposes stable fields.

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Phases 1–2.
2. Deliver US1 end-to-end (T011–T021) and validate via vitest + Playwright.
3. Demo the guided checklist as the MVP.

### Incremental Delivery
1. Ship US1 (checklist) → release to beta cohort.
2. Layer US2 (template priming) → verify React Flow instrumentation.
3. Layer US3 (analytics) → provide dashboards to stakeholders.

### Parallel Team Strategy
- Developer A: Leads backend services/routes (T014, T015, T025, T026, T034, T035).
- Developer B: Owns frontend checklist + template UI (T018–T020, T027–T030).
- Developer C: Focuses on telemetry, analytics, and Datadog assets (T021, T031–T038).
