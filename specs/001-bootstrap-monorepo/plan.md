# Implementation Plan: Initial Technical Skeleton (Mono-Repo)

**Branch**: `001-bootstrap-monorepo` | **Date**: 2025-10-29 | **Spec**: `/specs/001-bootstrap-monorepo/spec.md`
**Input**: Feature specification from `/specs/001-bootstrap-monorepo/spec.md`

## Summary

Establish a mono-repo baseline that hosts a Next.js 15 + Tailwind frontend and a FastAPI service, both containerized and orchestrated locally via Docker Compose. The iteration delivers workspace scaffolding, build metadata surface, health endpoint, shared tooling (pnpm, uv), automated tests (Vitest, Playwright smoke, pytest), and GitHub Actions pipelines that enforce linting, type safety, coverage thresholds, and container builds.

## Technical Context

The workspace ships as a pnpm + uv mono-repo: Node.js 20.11 LTS powers the Next.js frontend while Python 3.12 powers the FastAPI backend. Docker Compose orchestrates both services with shared build metadata surfaced through the `shared/` tooling. Frontend runtime configuration is validated with Zod to satisfy Simplicity Over Speculation (leveraging a dependency already standard for the team), and backend settings rely on Pydantic v2. CI guardrails mirror local scripts so lint, type-check, and test evidence stay consistent across environments.

**Language/Version**: TypeScript (Node.js 20 LTS) + Python 3.12  
**Primary Dependencies**: Next.js 15 (React 19), Tailwind CSS, FastAPI, Pydantic v2, pnpm, uv, Zod (frontend env loader)  
**Storage**: N/A (configuration and metadata only)  
**Testing**: Vitest (unit), Playwright (smoke), pytest (unit/integration), coverage ≥80%  
**Target Platform**: Frontend SSR/ISR on Linux containers; FastAPI service on Linux container with Uvicorn  
**Project Type**: Multi-app mono-repo (web client + backend service)  
**Performance Goals**: Web TTI ≤2s, LCP ≤2.5s, API health p95 ≤200ms, container start ≤30s  
**Constraints**: Cross-platform developer experience (macOS/Linux/WSL), reproducible containers, environment-driven configuration  
**Configuration Validation**: Frontend env loader uses Zod to enforce runtime checks while honoring Simplicity Over Speculation—leveraging a lightweight TypeScript-native schema tool already familiar to the team rather than speculating on bespoke parsers or bringing in broader config frameworks (e.g., `envsafe`, `valibot`) that add maintenance overhead without additional value.  
**Scale/Scope**: Skeleton for internal engineering team; two services, shared tooling, CI pipelines

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality Without Compromise**: Frontend gating via `pnpm lint --max-warnings 0`, `pnpm type-check`, `pnpm test:coverage`, `pnpm test:e2e --project smoke`; backend gating via `uv run ruff check`, `uv run pytest --cov=app --cov-report=term-missing`; containers scanned with `docker scout cves` prior to merge. Peer review required with evidence captured in CI logs.
- **Simplicity Over Speculation**: Deliverables map to FR-001–FR-007; no additional services or dependencies beyond Next.js, FastAPI, testing, Dockerfiles, and CI workflows specified in the feature spec. Shared utilities constrained to build metadata helpers and env settings documented in scope.
- **Test Evidence First**: Write failing Vitest unit tests for build metadata helper, Playwright smoke test for `/`, pytest for `/health`, and contract tests for compose services. Enforce ≥80% statement/branch coverage via `vitest --coverage` and `pytest --cov`, with thresholds enforced in config and CI.
- **Consistent Experience Every Time**: Tailwind tokens seeded from design primitives doc, base `app/layout.tsx` enforces global styles, and accessibility smoke included via Playwright axe plugin. Quickstart documents WCAG 2.2 AA checks for the landing page (focus order, contrast, semantics).
- **Performance and Reliability Budgets**: Capture metrics through Next.js build output (TTI proxy), Playwright performance traces, and Uvicorn startup timings in pytest. Document budgets (TTI ≤2s, LCP ≤2.5s, API p95 ≤200ms) and validate via smoke tests and CI logs; compose includes healthcheck intervals to monitor latency. Closed by tasks T048 and T049 to ensure frontend performance traces and container startup timings are archived in CI artifacts.

**Post-Phase-1 Review**: Design outputs (data model, contracts, quickstart) align with the above controls. No constitution violations identified; all gates remain in-force for implementation.

## Project Structure

### Documentation (this feature)

```text
specs/001-bootstrap-monorepo/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Docs Site Outputs (Phase 6)

```text
docs/
├── TROUBLESHOOTING.md   # T043: service troubleshooting matrix
├── QUICKSTART.md        # T044: validated walkthrough with CI timing references
└── RELEASE_CHECKLIST.md # T045: release readiness checklist
```

### Source Code (repository root)

```text
apps/
├── frontend/                # Next.js 15 app
│   ├── app/                 # App Router entrypoints (layout.tsx, page.tsx)
│   ├── lib/                 # Shared utilities (build metadata, env parsing)
│   ├── styles/              # Tailwind configuration and globals
│   └── tests/
│       ├── unit/            # Vitest suites
│       └── smoke/           # Playwright smoke project
├── backend/                 # FastAPI service
│   ├── app/
│   │   ├── core/            # settings.py, logging, config loaders
│   │   ├── api/
│   │   │   ├── routers/     # health router modules
│   │   │   └── dependencies/
│   │   └── factory.py       # app factory returning FastAPI instance
│   └── tests/
│       ├── unit/
│       └── integration/
└── shared/                  # Placeholder for future shared packages (lint configs, types)

configs/
├── docker/
│   ├── frontend.Dockerfile
│   └── backend.Dockerfile
├── compose/
│   └── docker-compose.dev.yml
└── ci/
    └── workflows/          # GitHub Actions definitions

.specify/                    # Planning artefacts (existing)
```

**Structure Decision**: Adopt an `apps/` mono-repo layout with isolated frontend and backend projects plus shared tooling directories, aligning with pnpm workspaces and uv-managed FastAPI service while keeping future shared packages centralized under `shared/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
