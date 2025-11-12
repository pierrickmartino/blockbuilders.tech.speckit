# Implementation Plan: Onboarding & First-Run Checklist

**Branch**: `004-onboarding-checklist` | **Date**: 2025-11-12 | **Spec**: `/specs/004-onboarding-checklist/spec.md`
**Input**: Feature specification from `/specs/004-onboarding-checklist/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Guide net-new strategy builders through a four-step onboarding checklist whose per-user progress persists across sessions, primes the React Flow-based strategy canvas with curated starter templates, and emits rich telemetry plus dashboards so growth teams can monitor drop-offs by cohort. Frontend work extends the existing Next.js 15 + React 19 + Tailwind CSS + shadcn/ui stack, while backend FastAPI + Supabase services persist checklist state, expose onboarding APIs, and ship analytics schemas/alerts.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (Node.js 20 LTS) for Next.js 15 App Router + React 19; Python 3.12 for FastAPI services  
**Primary Dependencies**: Next.js 15, React 19, Tailwind CSS 3.4, shadcn/ui, React Flow for canvas priming, Supabase JS client + auth helpers, FastAPI, Pydantic v2, Datadog Dashboards + event forwarder  
**Storage**: Supabase Postgres (checklist state, template selections, overrides) with Datadog metrics fed from the Supabase event forwarder for funnel dashboards  
**Testing**: `pnpm lint --max-warnings 0`, `pnpm type-check`, `pnpm test:coverage`, Playwright accessibility/e2e suites, `ruff check`, `uv run pytest`, analytics contract tests in CI  
**Target Platform**: Web app served via Next.js 15 (App Router + React Server Components) with Supabase edge functions/APIs  
**Project Type**: Web + service monorepo (apps/frontend, apps/backend)  
**Performance Goals**: Checklist visible ≤5 s after first load, adds <1 s to first meaningful paint, TTI ≤2 s, LCP ≤2.5 s, onboarding API p95 ≤200 ms, median time from first checklist view to backtest ≤15 min, dashboard filter recalculation ≤2 s  
**Constraints**: WCAG 2.2 AA compliance (focus trap, screen reader announcements), telemetry batching must not block UI threads, per-user checklist events must be idempotent with audit logs, React Flow integration must respect existing bundle budgets  
**Scale/Scope**: Impacts 90% of new workspaces monthly (thousands of users), ≥70% of template selectors must run a backtest without validation errors, dashboards must support cohorts (plan type, acquisition channel, signup month)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality Without Compromise**: Frontend slices must pass `pnpm lint --max-warnings 0`, `pnpm type-check`, `pnpm test:coverage`, and Playwright visual/axe suites; backend FastAPI endpoints must pass `ruff check`, `uv run pytest`, and API contract tests before review. Peer review confirms gates plus security scans before merge.
- **Simplicity Over Speculation**: Scope maps to FR-001–FR-010 only: checklist UI + persistence (FR-001/002/003/007/008), starter template priming with canvas integration (FR-004/005), telemetry schema + dashboards (FR-006/009/010). Any additional steps, templates, or analytics views require a governance exception.
- **Test Evidence First**: Write failing tests ahead of implementation—unit tests for checklist reducers/state machine, Supabase persistence + override logic, API contract tests for onboarding endpoints, Playwright flows for template selection + accessibility, analytics schema contract tests. Maintain ≥80% coverage via vitest + pytest reporting in CI.
- **Consistent Experience Every Time**: Use Tailwind tokens, shadcn/ui primitives, and React Flow inside accessible wrappers per `claude-nextjs-15.md`. Validate WCAG 2.2 AA via axe scans, keyboard navigation tests, and screen-reader verification of progress announcements.
- **Performance and Reliability Budgets**: Enforce ≤2 s TTI, ≤2.5 s LCP, checklist render adds <1 s to first meaningful paint, onboarding APIs ≤200 ms p95, telemetry batching ≤50 ms. Validate via Lighthouse CI, Datadog dashboards (event volume drop alerts >20%), and synthetic API load tests.

**Gate Status (Pre-Design)**: PASS — no constitution violations identified; proceeding to Phase 1 artifacts.
**Gate Status (Post-Design, 2025-11-12)**: PASS — research, data-model, contracts, and quickstart artifacts uphold all five principles without new exceptions.

## Project Structure

### Documentation (this feature)

```text
specs/004-onboarding-checklist/
├── plan.md              # Implementation plan (updated this run)
├── research.md          # Phase 0 artifact (completed)
├── data-model.md        # Phase 1 artifact (completed)
├── quickstart.md        # Phase 1 artifact (completed)
├── contracts/           # Phase 1 API contracts (includes onboarding.yaml)
└── tasks.md             # Phase 2 artifact produced by /speckit.tasks (not part of this run)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
apps/
├── frontend/
│   ├── app/                # Next.js 15 routes (App Router)
│   ├── components/         # Shared React 19 components + shadcn/ui wrappers
│   ├── lib/                # Client/server utilities, Supabase helpers
│   ├── styles/             # Tailwind tokens + generated CSS vars
│   └── tests/              # Playwright + vitest suites
└── backend/
    ├── app/                # FastAPI routers, services, Pydantic models
    ├── tests/              # Pytest suites (unit/integration)
    └── uv.lock / pyproject # Python dependency manifests

shared/                     # Cross-cutting packages/utilities consumed by apps
scripts/                    # Automation (setup-plan, agent context updates, etc.)
specs/004-onboarding-checklist/  # Feature documentation directory
```

**Structure Decision**: Continue delivering within the dual-app monorepo so checklist UI + React Flow workship lives under `apps/frontend` and onboarding APIs/telemetry handling live under `apps/backend`, reusing `/shared` utilities for common types.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
