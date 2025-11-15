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
- [ ] T002 [P] Add an `onboarding:init` target to `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/Makefile` that chains `pnpm install`, `uv sync --project apps/backend`, and feature-flag seeding per quickstart (establishes FR-002 per-user persistence + FR-006 telemetry tooling before tests run).
- [ ] T003 [P] Author `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/docs/features/onboarding-checklist.md` documenting feature flags, docker Supabase startup, and required secrets referenced in quickstart.md, linking back to FR-003 disclosures and FR-011 locale approvals as compliance evidence.
- [ ] T041 Capture locale-specific disclosure copy in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/specs/004-onboarding-checklist/checklists/disclosures.md`, route it through legal/compliance review, and record sign-off artifacts plus reviewer/date inside `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/docs/qa/onboarding-checklist.md` before UI work begins.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Deliver schema, RPCs, backend scaffolding, and telemetry plumbing demanded by both user stories before UI/API work begins.

**⚠️ CRITICAL**: Complete every task in this phase before touching any user story. Additionally, Phase 3 cannot begin until disclosure/legal gate T041 is finished (see Phase 1).

- [ ] T004 Create Supabase migration `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/shared/supabase/migrations/004_onboarding_checklist.sql` defining `OnboardingChecklist`, `ChecklistStepProgress`, `StarterTemplate`, `StarterTemplateSelection`, and `OnboardingEvent` tables plus required indexes and unique constraints from data-model.md.
- [ ] T005 [P] Extend `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/shared/supabase/rpc/get_active_onboarding_checklist.sql` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/shared/supabase/rpc/reset_onboarding_progress.sql` to expose active checklist payloads and atomic version resets.
- [ ] T006 [P] Seed default checklist version + disclosures + feature flag toggle in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/seed-onboarding.ts` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/shared/supabase/seed/onboarding_checklist.sql` to guarantee minimum four steps prior to tests.
- [ ] T036 [P] Add checklist reset broadcast data + version mismatch handling to `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/seed-onboarding.ts`, `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/shared/supabase/seed/onboarding_checklist.sql`, and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/tests/contracts/test_checklist_resets.py` so concurrent requests always read the latest version before resuming; expose a `definition_changed` flag for the frontend without touching UI yet.
- [ ] T007 Implement Pydantic schemas mirroring onboarding.yaml in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/schemas/onboarding.py` (ChecklistResponse, StepStatusRequest, TemplateSelectRequest, OverrideRequest, TelemetryEvent).
- [ ] T008 [P] Register FastAPI routers + dependency wiring for checklist, templates, overrides, and telemetry endpoints in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/api/onboarding/router.py` with stubs pointing to services.
- [ ] T009 [P] Update telemetry forwarder plumbing for new onboarding events in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/services/telemetry_forwarder.py` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/verify-forwarder.sh` (add onboarding scenario) to honor FR-006, explicitly covering `template_selected`, `override_pending_cleared`, and `backtest_success` payloads with Supabase→Datadog assertions.

**Checkpoint**: Database schema, RPCs, seeds, backend scaffolding, and telemetry hooks exist—user stories can now proceed.

---

## Phase 3: User Story 1 - Finish the guided checklist (Priority: P1) 🎯 MVP

**Prereq Reminder**: Do not start Phase 3 work until T001–T009 (Foundational) *and* T041 (legal-approved disclosures) are complete; this enforces FR-011 and the governance principle.

**Goal**: Deliver a four-step guided checklist modal whose state persists per user, enforces disclosure acknowledgements, supports dismiss/resume, logs telemetry, and allows manual overrides with audit trails.

**Independent Test**: Provision a new workspace, walk through steps in or out of order, refresh/re-login, and confirm progress + disclosures persist and the Resume/Mark-as-done controls restore state exactly where the user left off.

### Tests for User Story 1 (mandatory per spec)

- [ ] T010 [P] [US1] Implement contract tests for `GET /onboarding/checklist` and `POST /onboarding/steps/{stepId}/status` in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/tests/contracts/test_checklist_progress.py` using onboarding.yaml schemas.
- [ ] T011 [P] [US1] Add Vitest reducer/state-machine tests covering dismissal, resume, and disclosure gating in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/components/checklist/__tests__/checklist-state.test.ts`.
- [ ] T012 [P] [US1] Create Playwright journey verifying multi-session persistence, resume entry point, dual-confirmation override flow (including pending-state clearance after a backtest), and focus restoration in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/tests/e2e/onboarding-checklist.spec.ts`.
- [ ] T013 [P] [US1] Add axe + keyboard accessibility spec for the checklist modal in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/tests/a11y/onboarding-checklist.a11y.ts` to enforce FR-008.
- [ ] T037 [P] [US1] Add Playwright offline/crash resilience coverage in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/tests/e2e/onboarding-checklist.spec.ts`, forcing network drop + browser restart mid-step to confirm no duplicate events or corrupted `ChecklistStepProgress` rows.
- [ ] T046 [P] [US1] Implement Pytest contract coverage in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/tests/contracts/test_checklist_security.py` that exercises unauthenticated/unauthorized access to checklist, override, and telemetry endpoints, expecting 401/403 responses and no audit log mutations (satisfies Security NFR + Principle III).
- [ ] T047 [P] [US1] Extend `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/tests/e2e/onboarding-checklist.spec.ts` with a Playwright scenario where a regular teammate (non-support) exercises the dual-confirmation override, attempts bypasses (missing acknowledgement token, reused token), and the UI blocks the action while audit logs capture actor + denial reason.

### Implementation for User Story 1

- [ ] T014 [US1] Implement FastAPI handlers for checklist fetch/update/events in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/api/onboarding/router.py`, returning versioned payloads and HTTP 409 errors when disclosures/template diffs are missing.
- [ ] T015 [US1] Build checklist orchestration + reset logic in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/services/checklist_service.py` so per-user `ChecklistStepProgress` rows enforce ordering, overrides, and version resets.
- [ ] T016 [US1] Create Next.js Server Actions + Supabase auth helpers for checklist load/update/event mutations in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/app/(dashboard)/onboarding/actions.ts` (no client secrets).
- [ ] T017 [US1] Implement shadcn-based `ChecklistModal`, `StepProgressTracker`, and `DisclosurePanel` components in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/components/checklist/ChecklistModal.tsx` (plus colocated components) with focus trap + screen reader announcements, including the dual-step override confirmation UI and copy explaining activation-metric impact.
- [ ] T018 [US1] Add a persistent “Resume onboarding” masthead button (right of notifications) plus dismissal state handling to `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/app/(dashboard)/layout.tsx`, ensuring the masthead control re-opens the next incomplete step after reloads.
- [ ] T019 [US1] Implement Mark-as-done override API + audit logging in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/api/onboarding/overrides.py`, ensuring any signed-in teammate can initiate the flow after dual confirmation, persisting actor + reason fields, enforcing dual confirmation tokens, writing `override_pending` state, and emitting structured events to `ChecklistStepProgress` + `OnboardingEvent`.
- [ ] T020 [US1] Emit onboarding telemetry events (`viewed`, `step_start`, `step_complete`, `disclosure_ack`, `override`, `override_pending_cleared`, `template_selected`, `backtest_success`) via `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/lib/analytics/onboarding.ts` and ensure backend forwarding through `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/services/telemetry_forwarder.py`.
- [ ] T021 [US1] Extend `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/seed-onboarding.ts` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/shared/supabase/seed/onboarding_checklist.sql` to publish localized disclosure copy and enforce version-hash resets when step definitions change.
- [ ] T038 [US1] Implement idempotent checklist service + telemetry dedupe keyed on `(user_id, step_id, checklist_version)` in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/services/checklist_service.py` with coverage in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/tests/services/test_checklist_service.py` to tolerate reconnects/crashes without double completion.
- [ ] T042 [US1] Wire checklist reset banners/toasts inside `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/components/checklist/ChecklistModal.tsx` (and shared toast primitives) so users are informed when `definition_changed` is true, add a “Reload checklist” CTA, and expand `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/tests/e2e/onboarding-checklist.spec.ts` to cover the UX.

**Checkpoint**: Guided checklist is production-ready, accessible, auditable, and independently testable—qualifies as MVP.

---

## Phase 4: User Story 2 - Prime a draft strategy via starter templates (Priority: P2)

**Goal**: Allow users to pick curated starter templates from the checklist, enforce parameter edits before completion, and hydrate the React Flow canvas with a runnable draft that can immediately run a backtest.

**Independent Test**: From the checklist, select each starter template, edit at least one parameter, save the draft, and confirm the React Flow canvas opens with populated nodes/edges and the user can run a backtest without validation errors.

### Tests for User Story 2 (mandatory per spec)

- [ ] T022 [P] [US2] Implement Pytest contract tests for `POST /onboarding/templates/{templateId}/select` (parameter diff guard + draft id response) in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/tests/contracts/test_template_select.py`.
- [ ] T023 [P] [US2] Add Vitest unit tests for template diff validation + React Flow serialization in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/components/checklist/__tests__/template-step.test.tsx`.
- [ ] T024 [P] [US2] Create Playwright scenario verifying template selection primes the canvas + instant backtest, asserts that telemetry records `template_selected` + `backtest_success` events, and that the empty-template state renders the alternate CTA linking to `/docs/templates/strategy-library.md` with disabled completion in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/tests/e2e/template-prime.spec.ts`.
- [ ] T048 [P] [US2] Add Vitest + Playwright coverage in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/components/checklist/__tests__/template-security.test.tsx` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/tests/e2e/template-prime.spec.ts` to ensure template-selection server actions require a valid Supabase session and reject tampered payloads, logging security events per the NFR requirements.

### Implementation for User Story 2

- [ ] T025 [US2] Implement FastAPI template selection endpoint in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/api/onboarding/templates.py`, returning draft strategy metadata, a `templates_available` flag when none exist, logging `template_selected` events (with template metadata), and advancing the checklist step only after validated parameter edits.
- [ ] T026 [US2] Build `template_selection_service` in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/services/template_selection_service.py` to persist `StarterTemplateSelection`, capture React Flow snapshots, and enqueue telemetry for both `template_selected` and downstream `backtest_success` signals with template IDs.
- [ ] T027 [US2] Extend Next.js Server Actions in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/app/(dashboard)/onboarding/actions.ts` to call the template selection API, enforce parameter-edit + draft-save confirmation before marking the step complete, and emit the corresponding telemetry events.
- [ ] T028 [US2] Render a template gallery inside the checklist step using shadcn cards in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/components/checklist/TemplateStep.tsx`, showing description, estimated time, and “Use template” CTA, plus an empty-state CTA pointing to `/docs/templates/strategy-library.md` with explanatory copy when `templates_available` is false.
- [ ] T029 [US2] Wire the React Flow canvas priming pipeline in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/app/(dashboard)/templates/TemplateCanvas.tsx` so template selections hydrate nodes/edges and run-ready defaults instantly.
- [ ] T030 [US2] Seed at least three curated templates with metadata + React Flow schemas in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/seed-onboarding.ts` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/shared/supabase/seed/starter_templates.sql`, ensuring `requires_template_edit` flags align with data-model.md.

**Checkpoint**: Template selection step is fully functional, enabling immediate draft priming + backtests, independent from US1 once foundation exists.

---

## Phase 5: User Story 3 - Trust onboarding telemetry (Priority: P2)

**Goal**: Give product analysts trustworthy checklist telemetry—render latency, interaction events, SC-01/02/03 rollups—so regressions surface automatically in Datadog and CI.

**Independent Test**: Run `/scripts/ci/verify-sc-metrics.sh` to synthesize SC metrics, ensure failures block CI when budgets slip, confirm Datadog dashboards exclude `override_pending` sessions until `backtest_success`, and validate Supabase→Datadog monitors fire when fan-out exceeds 60 s.

### Tests for User Story 3

- [ ] T033 [P] Add release verification script `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/ci/onboarding-checklist-verify.sh` that chains the required lint/type/test commands before telemetry evidence uploads.
- [ ] T043 Add CI automation (`/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/ci/verify-sc-metrics.sh`) that synthesizes SC-01/02/03 metrics from Supabase fixtures or captured telemetry, fails builds on regression, and uploads evidence to `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/docs/qa/onboarding-checklist.md`.

### Implementation for User Story 3

- [ ] T032 [P] Update Datadog monitor definitions in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/configs/datadog/onboarding-checklist.json` to track checklist latency, p95 API times, forwarder errors, and `override_pending` states lingering without a subsequent backtest.
- [ ] T034 Build Supabase views + Datadog dashboards for SC-01/02/03 using onboarding telemetry in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/configs/datadog/onboarding-funnel.json`, documenting KPI queries, the ≤1 s SLA evidence, and the SC-02 (≤15 min) + SC-03 (≥70% template success) derivations in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/docs/qa/onboarding-checklist.md`.
- [ ] T035 [P] Add automated React Profiler/Web Vitals capture via `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/perf/measure-onboarding-checklist.ts` and wire it into CI to assert the ≤1 s checklist render budget.
- [ ] T039 Add FastAPI onboarding API load test suite (Locust or k6) under `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/tests/perf/onboarding_load_test.py` (invoked via `uv run`) to prove p95 latency ≤200 ms before release, recording evidence in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/docs/qa/onboarding-checklist.md`.
- [ ] T040 [P] Create `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/configs/datadog/onboarding-forwarder.json` monitors that alert when Supabase→Datadog fan-out exceeds 60 s or template/backtest-success rates fall below SC-03 thresholds, satisfying Constitution Principle V without duplicating the checklist monitor file.
- [ ] T044 Extend onboarding telemetry aggregation and Datadog dashboards to exclude `override_pending` sessions from activation/SC metrics until a `backtest_success` event clears the flag; cover this logic with backend unit tests and add monitor thresholds for violations.
- [ ] T054 [P] Wire `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/ci/report-sc-regression.ts` into `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/ci/onboarding-checklist-verify.sh` so failed `/scripts/ci/verify-sc-metrics.sh` runs automatically create or update a remediation task entry (referencing `/docs/qa/onboarding-checklist.md` evidence) inside `specs/004-onboarding-checklist/tasks.md`.
- [ ] T045 Measure async persistence responsiveness (e.g., checklist step submission latency ≤150 ms) via Playwright + browser performance APIs in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/perf/checklist-interaction.ts`, asserting results inside CI.

---

## Phase 6: User Story 4 - Legal-safe disclosures (Priority: P2)

**Goal**: Ensure every locale ships only after legal approval is recorded, referenced in docs, enforced by seeds, and validated during release checks.

**Independent Test**: Attempt to seed an unapproved locale and confirm the seed task fails with a pointer to `/docs/qa/onboarding-checklist.md`; load the checklist in that locale to see the “copy pending approval” message; run the release verification script to ensure Supabase locales match the approval registry.

### Tests for User Story 4

- [ ] T049 [P] [US4] Add Pytest contract tests in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/tests/contracts/test_disclosure_gate.py` that seed approved vs. unapproved locales, expect HTTP 409 + error payload when approvals are missing, and verify overrides remain blocked until approvals exist.
- [ ] T050 [P] [US4] Extend Playwright coverage in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/tests/e2e/disclosure-gate.spec.ts` to confirm unapproved locales show the “copy pending approval” message, block completion, and log QA evidence links.

### Implementation for User Story 4

- [ ] T051 [US4] Enforce locale approval gating inside `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/seed-onboarding.ts` and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/shared/supabase/seed/onboarding_checklist.sql`, aborting seeds when approval metadata is missing and outputting guidance pointing to `/docs/qa/onboarding-checklist.md`.
- [ ] T052 [US4] Add runtime enforcement to `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/api/onboarding/router.py`, `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend/app/services/checklist_service.py`, and `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend/src/components/checklist/ChecklistModal.tsx` so unapproved locales return 409 with structured details and UI surfaces the “copy pending approval” state blocking completion.
- [ ] T053 [P] [US4] Create `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/scripts/ci/verify-disclosure-approvals.sh` (invoked by `scripts/ci/onboarding-checklist-verify.sh`) that compares Supabase locale metadata against `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/docs/qa/onboarding-checklist.md`, fails CI on drift, and posts remediation links.
- [ ] T031 Document QA evidence, accessibility sign-off, disclosure approvals, and performance budgets in `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/docs/qa/onboarding-checklist.md`, including locale reviewer/date tables referenced by FR-011.

**Prerequisite Reminder**: T041 (Phase 1 disclosures + legal sign-off capture) must be completed/maintained for this story before any release step proceeds.

## Dependencies & Execution Order

- **Graph**: Setup → Foundational → US1 → US2 → US3 → US4. US2 can start once Foundational completes, but US3 waits on telemetry hooks from US1/US2, and US4 cannot begin until T041 (legal disclosures) plus US3 telemetry evidence exist.
- **Phase Dependencies**: Setup → Foundational → User Story phases → Release. User stories cannot start until T001–T009 complete, US1 cannot begin until T041 is finished, US3 depends on telemetry emitters from US1/US2, and US4 depends on both the legal artifacts (T041) and telemetry/CI harness (T033, T043).
- **User Story Order**: US1 (P1) is the MVP and must land before US2. US2 (P2) depends on the migrations/RPCs plus checklist modal infrastructure. US3 (P2) consumes telemetry hooks from earlier stories. US4 (P2) finalizes compliance gating after US3’s CI harness is in place.
- **Cross-Story Dependencies**: Telemetry + seeds (T006, T009, T021, T030, T051) underpin all stories; template gallery work (US2) reuses server actions created in US1 (T016); US3 leverages telemetry emitted in T020/T024; US4 reuses the CI runner from T033/T043 to execute the new disclosure verification script.

## Parallel Execution Examples

- **User Story 1**: Run T010–T013 (tests) in parallel while T015 builds backend orchestration and T017 builds the modal UI because they touch separate directories. Coordinate T018 after T017 to avoid layout conflicts.
- **User Story 2**: Execute T022–T024 concurrently, let one developer handle backend template endpoints (T025–T026) while another builds the React Flow/UI pieces (T027–T029); seed updates (T030) can run independently once template metadata is defined.

## Implementation Strategy

### MVP First (User Story 1)
1. Finish Phase 1–2 groundwork (T001–T009).
2. Complete US1 tests then implementation tasks (T010–T021 + T042) to deliver the end-to-end checklist.
3. Validate via Vitest, Playwright, axe, Pytest, and telemetry verification before merging.

### Incremental Delivery
1. Ship MVP (US1) to reach time-to-first-backtest goals and gather telemetry.
2. Layer in US2 (T022–T030) to unlock starter templates without blocking further learnings.
3. Harden telemetry/performance budgets with US3 (T032–T045) so CI evidence and Datadog monitors meet Principle V.
4. Lock legal approval gates with US4 (T031, T049–T053) before any release candidate is considered.

### Validation
Every user story (US1–US4) now has migrations/entities, backend services, server actions, UI, telemetry/compliance hooks, and dedicated failing-first tests. Each story can be tested independently using the listed “Independent Test” plus its automated suites.
