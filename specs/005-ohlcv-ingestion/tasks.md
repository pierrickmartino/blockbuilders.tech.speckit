# Tasks: Market Data Ingestion (OHLCV v1)

**Input**: Design documents from `/specs/005-ohlcv-ingestion/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

Tests are included because the specification marks user scenarios/testing as mandatory.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure environment configuration and docs are ready for implementation.

- [ ] T001 Create backend env template with Supabase/Datadog/email vars in `backend/.env.example`
- [ ] T002 [P] Create frontend env template with Supabase URL/key and status API base in `frontend/.env.local.example`
- [ ] T003 Document end-to-end setup steps (pnpm/uv install, env wiring, Timescale enablement) in `specs/005-ohlcv-ingestion/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema, configuration, and service scaffolding required by all stories.

- [ ] T004 Create Timescale migrations for assets, ohlcv_day, ohlcv_minute, ingestion_runs, lineage, remediation_log, alerts, vendor_status in `backend/src/models/migrations/005_ohlcv_ingestion.sql`
- [ ] T005 [P] Define Pydantic schemas for Asset, Candle, IngestionRun, LineageEntry, RemediationEntry, AlertEvent in `backend/src/models/schemas.py`
- [ ] T006 [P] Configure DB/Supabase client factory and connection settings in `backend/src/services/db.py`
- [ ] T007 Establish FastAPI router skeleton with status/ingestion/alerts namespaces in `backend/src/api/__init__.py`
- [ ] T008 Create shared asset config (fixed 10 symbols) and interval constants in `backend/src/config/assets.py`
- [ ] T009 Setup frontend API client wrapper with typed fetchers for status/lineage endpoints in `frontend/src/services/status-client.ts`

---

## Phase 3: User Story 1 - Monitor Coverage & Freshness (Priority: P1) 🎯 MVP

**Goal**: Status page shows coverage windows, latest timestamps, vendor health, and flags stale/gapped assets with filtering/export.

**Independent Test**: Load seeded data for 10 assets; verify coverage %, latest timestamp, vendor state display; filter to only stale assets; export remediation entries without running ingestion.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add contract tests for `/status/summary` and `/status/remediation` in `backend/tests/contract/test_status.py`
- [ ] T011 [P] [US1] Add Playwright a11y/filter test for status page in `frontend/tests/status-page.spec.ts`

### Implementation for User Story 1

- [ ] T012 [P] [US1] Implement status repository aggregations (coverage, freshness, vendor cache) in `backend/src/services/status_repository.py`
- [ ] T013 [US1] Implement FastAPI handlers for `/status/summary` and `/status/remediation` using contracts schema in `backend/src/api/status.py`
- [ ] T014 [P] [US1] Add remediation export serializer mapping DB rows to API schema in `backend/src/models/serializers.py`
- [ ] T015 [US1] Build Next.js status page layout with coverage/freshness tables and filters in `frontend/src/app/status/page.tsx`
- [ ] T016 [P] [US1] Create shared UI components (status badge, coverage range display, filter controls) in `frontend/src/components/status/`
- [ ] T017 [US1] Wire data fetching, stale highlighting, and export trigger to API client in `frontend/src/app/status/page.tsx`
- [ ] T018 [US1] Implement vendor status refresh/cache job and expose on summary response in `backend/src/services/vendor_status.py`

---

## Phase 4: User Story 2 - Backfill with Checksums (Priority: P2)

**Goal**: Backfill daily (3y) and minute (90d) OHLCV for 10 assets with checksum reports proving completeness and idempotent retries.

**Independent Test**: Trigger backfill on seeded dataset; verify checksum report per asset/interval matches expected row counts and lists gaps/duplicates without requiring alerts.

### Tests for User Story 2

- [ ] T019 [P] [US2] Add contract tests for `/ingestion/backfill` and `/ingestion/runs/{id}` in `backend/tests/contract/test_ingestion.py`
- [ ] T020 [P] [US2] Add pytest coverage for checksum generation and idempotent UPSERT on duplicates in `backend/tests/test_checksum.py`
- [ ] T021 [P] [US2] Create fixtures for 10-asset seed dataset and expected hashes in `backend/tests/fixtures/ohlcv_seed.py`

### Implementation for User Story 2

- [ ] T022 [P] [US2] Implement checksum helper over sorted canonical rows in `backend/src/services/checksum.py`
- [ ] T023 [US2] Implement ingestion/backfill service with retries/backoff and idempotent writes in `backend/src/services/ingestion.py`
- [ ] T024 [US2] Implement FastAPI POST `/ingestion/backfill` handler invoking service with window/interval args in `backend/src/api/ingestion.py`
- [ ] T025 [US2] Implement GET `/ingestion/runs/{id}` returning checksum report and row counts in `backend/src/api/ingestion.py`
- [ ] T026 [P] [US2] Add scheduled/CLI entry point for backfill runs (cron-friendly) in `backend/src/jobs/backfill.py`
- [ ] T027 [US2] Record remediation log entries for gaps/duplicates/checksum mismatches in `backend/src/services/remediation.py`
- [ ] T028 [US2] Surface checksum report link/status on frontend status page in `frontend/src/app/status/page.tsx`

---

## Phase 5: User Story 3 - Freshness Alerting (Priority: P3)

**Goal**: Detect freshness lag >60m every 10m, send single email alert per incident, clear when data catches up, and mirror stale state on status page.

**Independent Test**: Simulate delayed ingestion for one asset; verify alert email sent within 10 minutes with asset/lag/vendor info; confirm stale flag clears and no duplicate alerts after recovery.

### Tests for User Story 3

- [ ] T029 [P] [US3] Add pytest for freshness evaluation/deduped incidents and clearance logic in `backend/tests/test_alerts.py`
- [ ] T030 [P] [US3] Add contract test for `/alerts/test` endpoint in `backend/tests/contract/test_alerts.py`
- [ ] T031 [P] [US3] Add Playwright/ integration check that stale flag clears after data catch-up in `frontend/tests/status-stale.spec.ts`

### Implementation for User Story 3

- [ ] T032 [US3] Implement freshness monitor job (10m schedule) computing lag per asset/interval in `backend/src/jobs/freshness_monitor.py`
- [ ] T033 [US3] Implement email alert sender with distribution list + template in `backend/src/services/alerts.py`
- [ ] T034 [US3] Implement alert deduplication and resolution state updates in `backend/src/services/alerts.py`
- [ ] T035 [US3] Include alert state (stale flag, last alert) in `/status/summary` response in `backend/src/api/status.py`
- [ ] T036 [US3] Display alert badges and last-alert metadata on status page in `frontend/src/app/status/page.tsx`

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, documentation, and quality gates across stories.

- [ ] T037 [P] Update quickstart with new endpoints, seed fixtures, and alert email setup in `specs/005-ohlcv-ingestion/quickstart.md`
- [ ] T038 Add observability/Datadog dashboard notes for ingestion lag, run success, alert counts in `docs/observability/ohlcv.md`
- [ ] T039 [P] Add CI workflow for pnpm lint/type-check/test:coverage and ruff/pytest gates in `.github/workflows/ohlcv.yml`
- [ ] T040 Run accessibility/performance checklist and record results for status page in `frontend/tests/reports/status_a11y_perf.md`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → User Stories (Phases 3–5) → Polish.
- User stories proceed in priority order P1 → P2 → P3; once Phase 2 is complete, workstreams can run in parallel per story.

### Story Dependency Graph
- US1 (P1): depends on Phase 2; no downstream dependencies.
- US2 (P2): depends on Phase 2; consumes shared schemas/config; independent of US1 UI but shares remediation/logging.
- US3 (P3): depends on Phase 2; reads status repository; should not block on US2 checksums but shares ingestion_runs data.

## Parallel Execution Examples
- US1: T010 and T011 can run in parallel with T012; T016 can proceed while T013 is built.
- US2: T019–T021 can run in parallel while T022–T023 are implemented; T026 can be scheduled in parallel with API wiring.
- US3: T029–T031 can run alongside T032; T033 and T034 can proceed concurrently once schemas exist.

## Implementation Strategy
- MVP = Phase 1 + Phase 2 + US1 to deliver status visibility quickly.
- Incrementally add US2 for backfill integrity, then US3 for alerting.
- Maintain failing-first tests per story before implementation; keep endpoints aligned with contracts/openapi.yaml; prefer small deployable slices after each story.
