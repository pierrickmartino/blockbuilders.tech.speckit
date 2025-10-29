# Tasks: Initial Technical Skeleton (Mono-Repo)

**Input**: Design documents from `/specs/001-bootstrap-monorepo/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/  
**Tests**: Create only where required by the specification (this feature mandates frontend Vitest + Playwright smoke and backend pytest coverage).

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish repo-level tooling so apps can be bootstrapped consistently.

- [ ] T001 Create root workspace manifest with metadata and pnpm toolchain scripts in `package.json`
- [ ] T002 Declare workspace package locations for frontend and backend in `pnpm-workspace.yaml`
- [ ] T003 Pin Node.js 20.11 runtime for contributors in `.nvmrc`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared prerequisites required before implementing any user story.

- [ ] T004 Define ignore patterns for Node, Python, and Docker artefacts in `.gitignore`
- [ ] T005 Create reusable git metadata collector script emitting version/commit/timestamp in `shared/scripts/collect-build-metadata.sh`
- [ ] T006 Document environment variable contract spanning both services in `configs/ENVIRONMENT.md`

**Checkpoint**: Shared tooling in place—frontend and backend implementation can now proceed.

---

## Phase 3: User Story 1 - Launch baseline web client (Priority: P1) 🎯 MVP

**Goal**: Deliver a Next.js landing page that surfaces build metadata with Tailwind styling.  
**Independent Test**: Follow quickstart to run `pnpm dev --filter apps/frontend...` and verify the root route renders metadata attributes without console errors; Playwright smoke succeeds.

### Tests for User Story 1

- [ ] T007 [P] [US1] Author failing Vitest spec covering build snapshot shape in `apps/frontend/tests/unit/build-metadata.spec.ts`
- [ ] T008 [P] [US1] Add Playwright smoke test validating landing page metadata attributes in `apps/frontend/tests/smoke/root.spec.ts`
- [ ] T050 [P] [US1] Extend Vitest and Playwright coverage to assert default metadata labels render when git details are missing in `apps/frontend/tests/unit/build-metadata.spec.ts` and `apps/frontend/tests/smoke/root.spec.ts`

### Implementation for User Story 1

- [ ] T009 [US1] Create Next.js workspace package with scripts and dependencies in `apps/frontend/package.json`
- [ ] T010 [P] [US1] Configure TypeScript compiler options for App Router in `apps/frontend/tsconfig.json`
- [ ] T011 [P] [US1] Configure Next.js runtime settings and experimental flags in `apps/frontend/next.config.mjs`
- [ ] T012 [P] [US1] Configure Tailwind layers and content scanning in `apps/frontend/tailwind.config.ts`
- [ ] T013 [P] [US1] Add global stylesheet enabling Tailwind base, components, utilities in `apps/frontend/app/globals.css`
- [ ] T014 [P] [US1] Implement typed environment schema loader with zod in `apps/frontend/lib/env.ts`
- [ ] T015 [P] [US1] Implement build metadata helper consuming shared script output in `apps/frontend/lib/build-metadata.ts`
- [ ] T016 [US1] Compose root layout applying globals and injecting metadata context in `apps/frontend/app/layout.tsx`
- [ ] T017 [US1] Render landing page exposing build metadata via `data-app-*` attributes in `apps/frontend/app/page.tsx`
- [ ] T051 [US1] Handle missing git metadata by providing default labels before rendering in `apps/frontend/lib/build-metadata.ts` and `apps/frontend/app/page.tsx`
- [ ] T018 [P] [US1] Configure Vitest runner with coverage ≥80% in `apps/frontend/vitest.config.ts`
- [ ] T019 [P] [US1] Configure Playwright smoke project with axe accessibility checks in `apps/frontend/playwright.config.ts`
- [ ] T020 [P] [US1] Provide environment example placeholders for NEXT_PUBLIC variables in `apps/frontend/.env.example`
- [ ] T021 [US1] Document frontend dev, lint, and test workflows in `apps/frontend/README.md`

**Checkpoint**: Landing page renders metadata, smoke test passes, coverage thresholds enforced.

---

## Phase 4: User Story 2 - Verify service health contract (Priority: P2)

**Goal**: Deliver FastAPI health endpoint honoring OpenAPI contract with typed responses.  
**Independent Test**: Run backend dev server via `uv run fastapi dev apps/backend/app/main.py --reload`, invoke `/health`, and confirm 200 JSON matches schema; pytest suite passes with coverage.

### Tests for User Story 2

- [ ] T022 [P] [US2] Add pytest integration test for GET /health happy path in `apps/backend/tests/integration/test_health_endpoint.py`
- [ ] T023 [P] [US2] Add unit test asserting HealthStatus schema serialization in `apps/backend/tests/unit/test_health_status.py`

### Implementation for User Story 2

- [ ] T024 [US2] Create uv-managed project manifest with FastAPI, Pydantic, and test dependencies in `apps/backend/pyproject.toml`
- [ ] T025 [P] [US2] Implement typed settings loader with validation in `apps/backend/app/core/settings.py`
- [ ] T026 [P] [US2] Define Pydantic HealthStatus model enforcing contract in `apps/backend/app/schemas/health.py`
- [ ] T027 [P] [US2] Implement health router returning contract-compliant payload in `apps/backend/app/api/routers/health.py`
- [ ] T028 [US2] Build FastAPI application factory wiring routers in `apps/backend/app/factory.py`
- [ ] T029 [US2] Provide ASGI entrypoint for uvicorn and CLI execution in `apps/backend/app/main.py`
- [ ] T030 [P] [US2] Provide backend environment example covering required settings in `apps/backend/.env.example`
- [ ] T031 [US2] Document backend dev, lint, and test workflows in `apps/backend/README.md`

**Checkpoint**: Health endpoint satisfies tests, schema, and documentation requirements.

---

## Phase 5: User Story 3 - Guardrails for fast iteration (Priority: P3)

**Goal**: Establish automation, containers, and documentation enabling consistent lint/test/build workflows locally and in CI.  
**Independent Test**: Execute documented lint/test commands locally, run GitHub Actions pipelines, and build Docker images via compose without manual edits.

### Implementation for User Story 3

- [ ] T032 [P] [US3] Add root lint/test scripts orchestrating both apps in `package.json`
- [ ] T033 [P] [US3] Configure ESLint with Next.js, Tailwind, and testing presets in `apps/frontend/eslint.config.mjs`
- [ ] T034 [P] [US3] Configure Ruff linting rules and isort settings in `apps/backend/ruff.toml`
- [ ] T035 [US3] Enforce pytest coverage thresholds and tooling scripts in `apps/backend/pyproject.toml`
- [ ] T036 [P] [US3] Author Node-based development Dockerfile with pnpm cache mounts in `configs/docker/frontend.Dockerfile`
- [ ] T037 [P] [US3] Author Python development Dockerfile with uv cache mounts in `configs/docker/backend.Dockerfile`
- [ ] T038 [US3] Define docker-compose.dev stack with service healthchecks in `configs/compose/docker-compose.dev.yml`
- [ ] T039 [P] [US3] Add GitHub Actions workflow running lint, type-check, and tests in `configs/ci/workflows/ci.yml`
- [ ] T040 [P] [US3] Add GitHub Actions workflow building containers and running vulnerability scans in `configs/ci/workflows/containers.yml`
- [ ] T041 [US3] Create Makefile targets for dev, lint, test, and compose operations in `Makefile`
- [ ] T042 [US3] Update root README with CI matrices, container usage, troubleshooting, and links to recorded performance metrics in `README.md`
- [ ] T046 [P] [US3] Record lint/test execution time in CI runs and store evidence referenced by quickstart (SC-TEST)
- [ ] T047 [P] [US3] Instrument pytest to log `/health` latency across five CI runs and persist the aggregated report (SC-OPS)
- [ ] T048 [P] [US3] Collect Next.js build metrics and Playwright performance trace verifying TTI ≤2s and LCP ≤2.5s; publish runbook in `configs/ci/reports/frontend-performance.md`
- [ ] T049 [P] [US3] Capture frontend/backend container cold start timings in CI and store artifact summary in `configs/ci/reports/container-start-times.md`

**Checkpoint**: Tooling parity confirmed—local and CI workflows enforce guardrails for both services.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and validation tasks that span all stories.

- [ ] T043 Compile troubleshooting matrix for frontend/backend services in `docs/TROUBLESHOOTING.md`
- [ ] T044 Capture validated quickstart walkthrough aligning commands with reality and highlight CI timing/latency evidence in `docs/QUICKSTART.md`
- [ ] T045 Record release readiness checklist covering tests, coverage, and container scans in `docs/RELEASE_CHECKLIST.md`

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **User Stories (Phases 3–5)** → **Polish (Phase 6)**.
- User Story 1 depends on shared metadata script (T005) and workspace scaffolding (T001–T006); complete Phase 3 before starting US2 or US3 if working sequentially.
- User Story 2 depends on metadata script (T005) for version parity and on backend package scaffolding (T024) before routers/tests can pass.
- User Story 3 depends on both application stories to define build/test targets prior to wiring CI and containers.
- Polish tasks require all user stories to be complete to capture accurate documentation.

---

## Parallel Opportunities

- Tasks marked `[P]` within a phase touch independent files (e.g., T010–T015 in frontend, T025–T027 in backend) and can be split among contributors once prerequisite items in the same phase finish.
- After Phase 2 completes, User Story 1 and User Story 2 can run in parallel teams, with User Story 3 starting once each service exposes stable commands.
- CI workflow authoring (T039, T040) can proceed in parallel with Dockerfile tasks (T036, T037) because they operate on separate directories.

---

## Parallel Example: User Story 1

```bash
# Parallel tests
# T007 vs T008 (baseline Vitest + Playwright) target separate files and can be developed concurrently.
# T050 layers fallback coverage once baseline metadata rendering is in place.

# Parallel implementation
# T010–T015 cover tsconfig, next.config, tailwind config, env loader, and metadata helper.
# Assign each to different engineers while coordinating on shared conventions defined in T009.
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases (T001–T006).  
2. Deliver User Story 1 (T007–T021, T050–T051) and validate via `pnpm dev`, Vitest, and Playwright.  
3. Demo landing page metadata to stakeholders before expanding scope.

### Incremental Delivery

1. Ship User Story 1 as the MVP.  
2. Add User Story 2 (T022–T031) to expose health endpoint and pytest coverage.  
3. Layer in User Story 3 (T032–T042) for guardrails and automation.  
4. Finish with cross-cutting polish (T043–T045).

### Parallel Team Strategy

1. Pair focus: One team drives User Story 1 while another handles User Story 2 after foundational work.  
2. A third contributor can begin User Story 3 once both app stories expose stable commands, coordinating on Makefile and CI definitions.  
3. Reconvene to complete Polish tasks ensuring documentation matches delivered workflows.
