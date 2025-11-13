# Tasks: 004-Onboarding & First-Run Checklist

**Input**: Design documents from `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/specs/004-onboarding-checklist/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: This feature mandates failing-first tests per the constitution (Vitest, Playwright, axe, Pytest contract, Supabase→Datadog forwarder verification). Each story lists its independent test plus explicit test tasks.

**Organization**: Tasks are grouped by user story so each increment (US1, US2) can be developed, tested, and shipped independently.

**Quality Gates**: Every phase includes constitution requirements—lint/type checks, contract verification, accessibility, telemetry, and performance budgets—for the affected surfaces.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Task can run in parallel (touches different files and has no upstream dependency)
- **[Story]**: User story label (US1, US2). Setup, Foundational, and Polish phases omit story labels.
- All file paths are absolute per instructions.

## Path Conventions

- Frontend (Next.js 15, React 19): `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/...`
- Backend (FastAPI, Pydantic v2): `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/...`
- Supabase SQL + seeds: `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/shared/supabase/...`
- Scripts & tooling: `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/...`
- Documentation: `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/docs/...`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align environment templates, developer documentation, and automation hooks before touching feature code.

- [ ] T001 Add Supabase + Datadog onboarding placeholders to `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/.env.example` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/.env.example` so quickstart credentials cover checklist tables and forwarder keys.
- [ ] T002 [P] Add an `onboarding:init` target to `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/Makefile` that chains `pnpm install`, `uv sync --project apps/backend`, and feature-flag seeding per quickstart.
- [ ] T003 [P] Author `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/docs/features/onboarding-checklist.md` documenting feature flags, docker supabase startup, and required secrets referenced in quickstart.md.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Deliver schema, RPCs, backend scaffolding, and telemetry plumbing demanded by both user stories before UI/API work begins.

**⚠️ CRITICAL**: Complete every task in this phase before touching any user story.

- [ ] T004 Create Supabase migration `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/shared/supabase/migrations/004_onboarding_checklist.sql` defining `OnboardingChecklist`, `ChecklistStepProgress`, `StarterTemplate`, `StarterTemplateSelection`, and `OnboardingEvent` tables plus required indexes and unique constraints from data-model.md.
- [ ] T005 [P] Extend `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/shared/supabase/rpc/get_active_onboarding_checklist.sql` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/shared/supabase/rpc/reset_onboarding_progress.sql` to expose active checklist payloads and atomic version resets.
- [ ] T006 [P] Seed default checklist version + disclosures + feature flag toggle in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/seed-onboarding.ts` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/shared/supabase/seed/onboarding_checklist.sql` to guarantee minimum four steps prior to tests.
- [ ] T007 Implement Pydantic schemas mirroring onboarding.yaml in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/schemas/onboarding.py` (ChecklistResponse, StepStatusRequest, TemplateSelectRequest, OverrideRequest, TelemetryEvent).
- [ ] T008 [P] Register FastAPI routers + dependency wiring for checklist, templates, overrides, and telemetry endpoints in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/api/onboarding/router.py` with stubs pointing to services.
- [ ] T009 [P] Update telemetry forwarder plumbing for new onboarding events in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/services/telemetry_forwarder.py` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/verify-forwarder.sh` (add onboarding scenario) to honor FR-006.

**Checkpoint**: Database schema, RPCs, seeds, backend scaffolding, and telemetry hooks exist—user stories can now proceed.

---

## Phase 3: User Story 1 - Finish the guided checklist (Priority: P1) 🎯 MVP

**Goal**: Deliver a four-step guided checklist modal whose state persists per user, enforces disclosure acknowledgements, supports dismiss/resume, logs telemetry, and allows manual overrides with audit trails.

**Independent Test**: Provision a new workspace, walk through steps in or out of order, refresh/re-login, and confirm progress + disclosures persist and the Resume/Mark-as-done controls restore state exactly where the user left off.

### Tests for User Story 1 (mandatory per spec)

- [ ] T010 [P] [US1] Implement contract tests for `GET /onboarding/checklist` and `POST /onboarding/steps/{stepId}/status` in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/tests/contracts/test_checklist_progress.py` using onboarding.yaml schemas.
- [ ] T011 [P] [US1] Add Vitest reducer/state-machine tests covering dismissal, resume, and disclosure gating in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/components/checklist/__tests__/checklist-state.test.ts`.
- [ ] T012 [P] [US1] Create Playwright journey verifying multi-session persistence, resume entry point, dual-confirmation override flow (including pending-state clearance after a backtest), and focus restoration in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/tests/e2e/onboarding-checklist.spec.ts`.
- [ ] T013 [P] [US1] Add axe + keyboard accessibility spec for the checklist modal in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/tests/a11y/onboarding-checklist.a11y.ts` to enforce FR-008.

### Implementation for User Story 1

- [ ] T014 [US1] Implement FastAPI handlers for checklist fetch/update/events in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/api/onboarding/router.py`, returning versioned payloads and HTTP 409 errors when disclosures/template diffs are missing.
- [ ] T015 [US1] Build checklist orchestration + reset logic in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/services/checklist_service.py` so per-user `ChecklistStepProgress` rows enforce ordering, overrides, and version resets.
- [ ] T016 [US1] Create Next.js Server Actions + Supabase auth helpers for checklist load/update/event mutations in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/app/(dashboard)/onboarding/actions.ts` (no client secrets).
- [ ] T017 [US1] Implement shadcn-based `ChecklistModal`, `StepProgressTracker`, and `DisclosurePanel` components in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/components/checklist/ChecklistModal.tsx` (plus colocated components) with focus trap + screen reader announcements, including the dual-step override confirmation UI and copy explaining activation-metric impact.
- [ ] T018 [US1] Add persistent “Resume onboarding” entry point and dismissal state handling to `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/app/(dashboard)/layout.tsx`, ensuring modal re-opens to the next incomplete step.
- [ ] T019 [US1] Implement Mark-as-done override API + audit logging in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/api/onboarding/overrides.py`, persisting actor + reason fields, enforcing dual confirmation tokens, writing `override_pending` state, and emitting structured events to `ChecklistStepProgress` + `OnboardingEvent`.
- [ ] T020 [US1] Emit onboarding telemetry events (`viewed`, `step_start`, `step_complete`, `disclosure_ack`, `override`, `override_pending_cleared`) via `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/lib/analytics/onboarding.ts` and ensure backend forwarding through `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/services/telemetry_forwarder.py`.
- [ ] T021 [US1] Extend `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/seed-onboarding.ts` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/shared/supabase/seed/onboarding_checklist.sql` to publish localized disclosure copy and enforce version-hash resets when step definitions change.

**Checkpoint**: Guided checklist is production-ready, accessible, auditable, and independently testable—qualifies as MVP.

---

## Phase 4: User Story 2 - Prime a draft strategy via starter templates (Priority: P2)

**Goal**: Allow users to pick curated starter templates from the checklist, enforce parameter edits before completion, and hydrate the React Flow canvas with a runnable draft that can immediately run a backtest.

**Independent Test**: From the checklist, select each starter template, edit at least one parameter, save the draft, and confirm the React Flow canvas opens with populated nodes/edges and the user can run a backtest without validation errors.

### Tests for User Story 2 (mandatory per spec)

- [ ] T022 [P] [US2] Implement Pytest contract tests for `POST /onboarding/templates/{templateId}/select` (parameter diff guard + draft id response) in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/tests/contracts/test_template_select.py`.
- [ ] T023 [P] [US2] Add Vitest unit tests for template diff validation + React Flow serialization in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/components/checklist/__tests__/template-step.test.tsx`.
- [ ] T024 [P] [US2] Create Playwright scenario verifying template selection primes the canvas + instant backtest and that the empty-template state renders the alternate CTA + disabled completion in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/tests/e2e/template-prime.spec.ts`.

### Implementation for User Story 2

- [ ] T025 [US2] Implement FastAPI template selection endpoint in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/api/onboarding/templates.py`, returning draft strategy metadata, a `templates_available` flag when none exist, and advancing the checklist step only after validated parameter edits.
- [ ] T026 [US2] Build `template_selection_service` in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/services/template_selection_service.py` to persist `StarterTemplateSelection`, capture React Flow snapshots, and enqueue telemetry.
- [ ] T027 [US2] Extend Next.js Server Actions in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/app/(dashboard)/onboarding/actions.ts` to call the template selection API and enforce parameter-edit + draft-save confirmation before marking the step complete.
- [ ] T028 [US2] Render a template gallery inside the checklist step using shadcn cards in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/components/checklist/TemplateStep.tsx`, showing description, estimated time, and “Use template” CTA, plus an empty-state CTA + explanatory copy when `templates_available` is false.
- [ ] T029 [US2] Wire the React Flow canvas priming pipeline in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/app/(dashboard)/templates/TemplateCanvas.tsx` so template selections hydrate nodes/edges and run-ready defaults instantly.
- [ ] T030 [US2] Seed at least three curated templates with metadata + React Flow schemas in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/seed-onboarding.ts` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/shared/supabase/seed/starter_templates.sql`, ensuring `requires_template_edit` flags align with data-model.md.

**Checkpoint**: Template selection step is fully functional, enabling immediate draft priming + backtests, independent from US1 once foundation exists.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Hardening work shared across stories—documentation, monitoring, and release automation.

- [ ] T031 Document QA evidence, accessibility sign-off, and performance budgets in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/docs/qa/onboarding-checklist.md`, linking to test artifacts.
- [ ] T032 [P] Update Datadog monitor definitions in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/configs/datadog/onboarding-checklist.json` to track checklist latency, p95 API times, forwarder errors, and override_pending states that linger without a subsequent backtest.
- [ ] T033 [P] Add release verification script `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/ci/onboarding-checklist-verify.sh` that runs `pnpm lint`, `pnpm type-check`, `pnpm test:coverage`, `pnpm test:e2e`, `pnpm test:a11y`, `ruff check`, and `uv run pytest` in sequence.
- [ ] T034 Build Supabase views + Datadog dashboards for SC-01/02/03 using onboarding telemetry in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/configs/datadog/onboarding-funnel.json` and document KPI queries in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/docs/qa/onboarding-checklist.md`.
- [ ] T035 [P] Add automated React Profiler/Web Vitals capture via `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/perf/measure-onboarding-checklist.ts` and wire it into CI to assert the ≤1 s checklist render budget.

---

## Dependencies & Execution Order

- **Graph**: Setup → Foundational → US1 → US2 → Polish (US2 can begin after Foundational if US1 server actions are stubbed, but shipping order remains linear).
- **Phase Dependencies**: Setup → Foundational → User Story phases → Polish. User stories cannot start until T001–T009 complete.
- **User Story Order**: US1 (P1) is the MVP and must land before US2. US2 (P2) depends on the migrations/RPCs plus checklist modal infrastructure but not on US1-specific UI once Phase 2 finishes.
- **Cross-Story Dependencies**: Telemetry + seeds (T006, T009, T021, T030) underpin both stories; template gallery work (US2) reuses server actions created in US1 (T016), so branch carefully.

## Parallel Execution Examples

- **User Story 1**: Run T010–T013 (tests) in parallel while T015 builds backend orchestration and T017 builds the modal UI because they touch separate directories. Coordinate T018 after T017 to avoid layout conflicts.
- **User Story 2**: Execute T022–T024 concurrently, let one developer handle backend template endpoints (T025–T026) while another builds the React Flow/UI pieces (T027–T029); seed updates (T030) can run independently once template metadata is defined.

## Implementation Strategy

### MVP First (User Story 1)
1. Finish Phase 1–2 groundwork (T001–T009).
2. Complete US1 tests then implementation tasks (T010–T021) to deliver the end-to-end checklist.
3. Validate via Vitest, Playwright, axe, Pytest, and telemetry verification before merging.

### Incremental Delivery
1. Ship MVP (US1) to reach time-to-first-backtest goals and gather telemetry.
2. Layer in US2 (T022–T030) to unlock starter templates without blocking further learnings.
3. Close with Polish tasks (T031–T033) once both stories are stable.

### Validation
Every user story now has: migrations/entities, backend services, server actions, UI, telemetry, and dedicated failing-first tests. Each story can be tested independently using the listed “Independent Test” plus its automated suites.
