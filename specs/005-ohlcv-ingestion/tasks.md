# Tasks: Market Data Ingestion (OHLCV v1)

**Input**: Design documents from `/specs/005-ohlcv-ingestion/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

Tests are included because the specification marks user scenarios/testing as mandatory. Per Constitution III, test tasks must be authored and executed before their corresponding implementation tasks.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure environment configuration and docs are ready for implementation.

- [X] T001 Create backend env template with Supabase/Datadog/email vars in `backend/.env.example`
- [X] T002 [P] Create frontend env template with Supabase URL/key and status API base in `frontend/.env.local.example`
- [X] T003 Document end-to-end setup steps (pnpm/uv install, env wiring, Timescale enablement) in `specs/005-ohlcv-ingestion/quickstart.md`
- [X] T004 Verify Web Vitals/performance budgets (TTI ≤2s, LCP ≤2.5s) are documented in `specs/005-ohlcv-ingestion/spec.md` and aligned with tests T017/T050
- [X] T005 Verify load-test goal (p95 ≤200ms for status/lineage APIs) is documented in `specs/005-ohlcv-ingestion/plan.md` and reflected in perf tests T016/T055

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema, configuration, and service scaffolding required by all stories.

- [X] T006 Create Timescale migrations for assets, ohlcv_day, ohlcv_minute, ingestion_runs, lineage, remediation_log, alerts, vendor_status in `backend/src/models/migrations/005_ohlcv_ingestion.sql`
- [X] T007 [P] Define Pydantic schemas for Asset, Candle, IngestionRun, LineageEntry, RemediationEntry, AlertEvent in `backend/src/models/schemas.py`
- [X] T008 [P] Configure DB/Supabase client factory and connection settings in `backend/src/services/db.py`
- [X] T009 Establish FastAPI router skeleton with status/ingestion/alerts namespaces in `backend/src/api/__init__.py`
- [X] T010 Create shared asset config (fixed 10 symbols) and interval constants in `backend/src/config/assets.py`
- [X] T011 Setup frontend API client wrapper with typed fetchers for status/lineage endpoints in `frontend/src/services/status-client.ts`

---

## Phase 3: User Story 1 - Monitor Coverage & Freshness (Priority: P1) 🎯 MVP

**Goal**: Status page shows coverage windows, latest timestamps, vendor health, and flags stale/gapped assets with filtering/export.

**Independent Test**: Load seeded data for 10 assets; verify coverage %, latest timestamp, vendor state display; filter to only stale assets; export remediation entries without running ingestion.

### Tests for User Story 1

- [X] T012 [P] [US1] Contract tests for `/status/summary` and `/status/remediation` in `backend/tests/contract/test_status.py`
- [X] T013 [P] [US1] Playwright a11y/filter test for status page in `frontend/tests/status/status-page.spec.ts`
- [X] T013a [P] [US1] Playwright refresh behavior test (auto 30s + manual button, refresh <2s, no full reload) in `frontend/tests/status/status-refresh.spec.ts`
- [X] T014 [P] [US1] Contract test for `/status/remediation` filters and payload shape in `backend/tests/contracts/test_remediation.py`
- [X] T015 [P] [US1] Contract tests for `/lineage` (success/empty window/error) in `backend/tests/contract/test_lineage.py`
- [X] T016 [P] [US1] Load test `/status/summary` (p95 ≤200ms for 10 assets) in `backend/tests/perf/status_load.js`
- [X] T016a [P] [US1] Load test `/lineage` (p95 ≤200ms for 10 assets, 90d minute window) in `backend/tests/perf/lineage_load.js`
- [X] T017 [P] [US1] Capture Web Vitals (TTI/LCP budgets) for status page via Playwright trace in `frontend/tests/perf/status-webvitals.spec.ts`
- [X] T059 [P] [US1] Contract/UI test ensuring status/lineage responses and UI omit backend implementation details (no internal hosts/credentials/infra identifiers) in `backend/tests/contract/test_status_privacy.py`
- [X] T059a [P] [US1] Playwright check shows vendor “unavailable/rate-limited” badge when outage/remediation flag set in `frontend/tests/status/status-vendor-outage.spec.ts`

### Implementation for User Story 1

- [X] T018 [P] [US1] Implement status repository aggregations (coverage, freshness, vendor cache) in `backend/src/services/status_repository.py`
- [X] T019 [US1] Implement FastAPI handlers for `/status/summary` and `/status/remediation` using contracts schema in `backend/src/api/status.py`
- [X] T020 [P] [US1] Add remediation export serializer mapping DB rows to API schema in `backend/src/models/serializers.py`
- [X] T021 [P] [US1] Implement lineage repository query (asset/start/end/interval) in `backend/src/services/lineage_repository.py`
- [X] T022 [US1] Implement FastAPI GET `/lineage` handler matching openapi spec in `backend/src/api/lineage.py`
- [X] T023 [P] [US1] Create shared UI components (status badge, coverage range display, filter controls) in `frontend/components/status/`
- [X] T024 [US1] Build Next.js status page layout with coverage/freshness tables and filters in `frontend/app/status/page.tsx`
- [X] T025 [US1] Wire data fetching, stale highlighting, lineage/remediation export trigger to API client in `frontend/app/status/page.tsx`
- [X] T026 [US1] Implement vendor status refresh/cache job (10m cadence, 15m TTL, error fallback) and expose on summary response in `backend/app/services/vendor_status.py`
- [X] T027 [US1] Record performance/a11y results in `frontend/tests/reports/status_a11y_perf.md`

---

## Phase 4: User Story 2 - Backfill with Checksums (Priority: P2)

**Goal**: Backfill daily (3y) and minute (90d) OHLCV for 10 assets with checksum reports proving completeness and idempotent retries.

**Independent Test**: Trigger backfill on seeded dataset; verify checksum report per asset/interval matches expected row counts and lists gaps/duplicates without requiring alerts.

### Tests for User Story 2

- [X] T028 [P] [US2] Contract tests for `/ingestion/backfill` and `/ingestion/runs/{id}` in `backend/tests/contract/test_ingestion.py`
- [X] T029 [P] [US2] Pytest coverage for checksum generation and idempotent UPSERT on duplicates in `backend/tests/test_checksum.py`
- [X] T030 [P] [US2] Fixtures for 10-asset seed dataset and expected hashes in `backend/tests/fixtures/ohlcv_seed.py`
- [X] T054 [P] [US2] Pytest simulating failing runs, retries, and rolling 30-day success-rate calculation (≥99%) in `backend/tests/test_success_rate.py`
- [X] T055 [P] [US2] Metric/telemetry test ensuring 30-day retention and query path for run success metrics in `backend/tests/perf/test_telemetry_retention.py`
- [X] T056 [P] [US2] Pytest covering DST short/long days and partial-interval ingestion to prevent gaps/overlaps in `backend/tests/test_ingestion_edge_cases.py`
- [X] T056a [P] [US2] Pytest simulating vendor 429/503 with exponential backoff, remediation log entry, and non-duplicated alerts in `backend/tests/test_ingestion_edge_cases.py`
- [X] T057 [P] [US2] Pytest for resume-after-interrupt ensuring idempotent retries with no duplicate OHLCV rows in `backend/tests/test_ingestion_resume.py`

### Implementation for User Story 2

- [X] T031 [P] [US2] Implement checksum helper over sorted canonical rows in `backend/src/services/checksum.py`
- [X] T032 [US2] Implement ingestion/backfill service with retries/backoff and idempotent writes in `backend/src/services/ingestion.py`
- [X] T033 [US2] Implement FastAPI POST `/ingestion/backfill` handler invoking service with window/interval args in `backend/src/api/ingestion.py`
- [X] T034 [US2] Implement GET `/ingestion/runs/{id}` returning checksum report and row counts in `backend/src/api/ingestion.py`
- [X] T035 [P] [US2] Add scheduled/CLI entry point for backfill runs (cron-friendly) in `backend/src/jobs/backfill.py`
- [X] T036 [US2] Record remediation log entries for gaps/duplicates/checksum mismatches in `backend/src/services/remediation.py`
- [X] T037 [US2] Surface checksum report link/status on frontend status page in `frontend/src/app/status/page.tsx`

---

## Phase 5: User Story 3 - Freshness Alerting (Priority: P3)

**Goal**: Detect freshness lag >60m every 10m, send single email alert per incident, clear when data catches up, and mirror stale state on status page.

**Independent Test**: Simulate delayed ingestion for one asset; verify alert email sent within 10 minutes with asset/lag/vendor info; confirm stale flag clears and no duplicate alerts after recovery.

### Tests for User Story 3

- [ ] T038 [P] [US3] Pytest for freshness evaluation/deduped incidents and clearance logic in `backend/tests/test_alerts.py`
- [ ] T039 [P] [US3] Contract test for `/alerts/test` endpoint in `backend/tests/contract/test_alerts.py`
- [ ] T040 [P] [US3] Playwright integration check that stale flag clears after data catch-up in `frontend/tests/status-stale.spec.ts`
- [ ] T041 [P] [US3] Pytest asserting alert email payload includes subject prefix, asset, interval, lag minutes, vendor status, incident id, run timestamp, status-page deep link, and distro list single-fire behavior in `backend/tests/test_alerts_email.py`

### Implementation for User Story 3

- [ ] T042 [US3] Implement freshness monitor job (10m schedule) computing lag per asset/interval in `backend/src/jobs/freshness_monitor.py`
- [ ] T043 [US3] Implement email alert sender with distribution list + template in `backend/src/services/alerts.py`
- [ ] T044 [US3] Implement alert deduplication and resolution state updates in `backend/src/services/alerts.py`
- [ ] T045 [US3] Include alert state (stale flag, last alert) in `/status/summary` response in `backend/src/api/status.py`
- [ ] T046 [US3] Display alert badges and last-alert metadata on status page in `frontend/src/app/status/page.tsx`

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, documentation, and quality gates across stories.

- [ ] T047 [P] Update quickstart with new endpoints, seed fixtures, and alert email setup in `specs/005-ohlcv-ingestion/quickstart.md`
- [ ] T048 Add observability/Datadog dashboard notes for ingestion lag, run success, alert counts, and publish dashboard/runbook links in `docs/observability/ohlcv.md`
- [ ] T049 [P] Add CI workflow for pnpm lint/type-check/test:coverage and ruff/pytest gates in `.github/workflows/ohlcv.yml`
- [ ] T050 Run accessibility/performance checklist and record results for status page in `frontend/tests/reports/status_a11y_perf.md`
- [ ] T051 [P] Instrument Datadog metrics for ingestion runs (success, duration, rows, lag) in `backend/src/services/ingestion.py`
- [ ] T052 [P] Emit freshness lag gauge and alert count metrics in `backend/src/jobs/freshness_monitor.py`
- [ ] T058 [P] Validate 30-day failure-log query path and dashboard surfacing (errors and retries) in `backend/tests/contract/test_failures_log.py`

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → User Stories (Phases 3–5) → Polish.
- User stories proceed in priority order P1 → P2 → P3; once Phase 2 is complete, workstreams can run in parallel per story.

### Story Dependency Graph
- US1 (P1): depends on Phase 2; no downstream dependencies.
- US2 (P2): depends on Phase 2; consumes shared schemas/config; independent of US1 UI but shares remediation/logging.
- US3 (P3): depends on Phase 2; reads status repository; should not block on US2 checksums but shares ingestion_runs data.

## Parallel Execution Examples
- US1: T012–T017 can run in parallel; T023 can proceed while T019 is built.
- US2: T028–T030 can run in parallel while T031–T034 are implemented; T035 can be scheduled alongside API wiring.
- US3: T038–T041 can run alongside T042; T043 and T044 can proceed concurrently once schemas exist.

## Implementation Strategy
- MVP = Phase 1 + Phase 2 + US1 to deliver status visibility quickly.
- Incrementally add US2 for backfill integrity, then US3 for alerting.
- Maintain failing-first tests per story before implementation; keep endpoints aligned with contracts/openapi.yaml; prefer small deployable slices after each story.
