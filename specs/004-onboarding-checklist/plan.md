# Implementation Plan: 004-onboarding-checklist

**Branch**: `004-onboarding-checklist` | **Date**: 2025-11-12 | **Spec**: `/specs/004-onboarding-checklist/spec.md`
**Input**: Feature specification from `/specs/004-onboarding-checklist/spec.md`

## Summary

Deliver a four-step onboarding checklist that persistently guides first-time users through disclosures, data connection, starter template priming, and first backtest execution. The frontend remains on the approved stack (Next.js 15 App Router, React 19, Tailwind CSS 3.4, shadcn/ui) and uses React Flow to prime the strategy canvas immediately after a template is selected—or to surface a documented alternate CTA when no templates exist. Supabase Postgres stores onboarding state and telemetry, while a FastAPI service (Python 3.12) enforces checklist versioning, dual-confirmation overrides with `override_pending` state, and Datadog forwarding so resets, analytics, and SC-01/02/03 instrumentation stay consistent with FR-002 through FR-010.

## Technical Context

**Language/Version**: TypeScript on Node.js 20 (Next.js 15 App Router, React 19) plus Python 3.12 (FastAPI service tier).  
**Primary Dependencies**: Tailwind CSS 3.4 tokens, shadcn/ui primitives, React Flow for canvas priming, Supabase JS client + auth helpers, Supabase Postgres schemas, FastAPI + Pydantic v2, Datadog forwarder, Vitest/Playwright, Ruff/Pytest.  
**Storage**: Supabase Postgres (onboarding checklist definitions, per-user progress, template selections, telemetry queues).  
**Testing**: `pnpm lint --max-warnings 0`, `pnpm type-check`, `pnpm test:coverage`, `pnpm test:e2e`, `pnpm test:a11y`, `ruff check`, `uv run pytest`, contract tests generated from `/specs/004-onboarding-checklist/contracts/onboarding.yaml`.  
**Target Platform**: Web (Next.js 15 app served via Vercel/Turbopack) plus containerized FastAPI running on Linux with Supabase connectivity.  
**Project Type**: Web + backend service (apps/frontend + apps/backend monorepo structure).  
**Performance Goals**: Checklist modal visible ≤1 s after dashboard load (captured via React Profiler/Web Vitals automation), page-level TTI ≤2 s and LCP ≤2.5 s, onboarding API p95 latency ≤200 ms, telemetry fan-out to Datadog ≤60 s, and dashboards that expose SC-01/02/03 KPIs.  
**Constraints**: Per-user progress isolation even inside shared workspaces, disclosure acknowledgement must precede completion, template steps require parameter edits + draft saves, checklist definition changes trigger atomic resets, React Flow canvas integration must reuse existing strategy draft pipeline without new core dependencies.  
**Scale/Scope**: All new workspaces and first-run teammates (~10k monthly activations) with multi-device persistence and Datadog dashboards sourcing funnel metrics.

## Constitution Check

- **Code Quality Without Compromise**: Frontend changes run `pnpm lint --max-warnings 0`, `pnpm type-check`, `pnpm test:coverage`, `pnpm test:e2e`, and `pnpm test:a11y`; backend work runs `ruff check`, `uv run pytest`, and OpenAPI contract verification. CI must stay green before merge, with reviewers confirming evidence.  
- **Simplicity Over Speculation**: All deliverables map directly to FR-001–FR-010 (UI checklist, Supabase persistence, template priming via React Flow, telemetry forwarder, KPI instrumentation). No new third-party dependencies beyond React Flow (already approved requirement) and existing Supabase/Datadog plumbing. Any future template variants defer until new specs demand them.  
- **Test Evidence First**: Write failing Vitest unit tests for checklist reducer/state machine, Playwright e2e coverage for resume + overrides, axe-based accessibility tests for modal focus, and Pytest contract tests for version reset + telemetry endpoints before implementation; maintain ≥80 % coverage per constitution.  
- **Consistent Experience Every Time**: Use shared Tailwind tokens + shadcn/ui modal/stepper primitives, adhere to `claude-nextjs-15.md` focus-management guidance, and document WCAG 2.2 AA acceptance checks (focus trap, SR announcements, keyboard navigation) linked to FR-001/FR-008 before build.  
- **Performance and Reliability Budgets**: Track Next.js performance budgets (TTI ≤2 s, LCP ≤2.5 s) via Web Vitals CI, assert checklist render cost ≤1 s via automated React Profiler runs, enforce FastAPI p95 ≤200 ms with load tests, validate Supabase→Datadog delivery under 60 s with forwarder telemetry, and ship Datadog dashboards that report SC-01/02/03 before code complete.

**Post-Design Revalidation (2025-11-12)**: Phase 0 research decisions and Phase 1 artifacts (data-model, contracts, quickstart) confirm all five constitutional gates remain satisfied; no exceptions requested.

## Project Structure

### Documentation (this feature)

```text
specs/004-onboarding-checklist/
├── plan.md          # Implementation plan (this file)
├── research.md      # Phase 0 research decisions
├── data-model.md    # Phase 1 entity definitions
├── quickstart.md    # Phase 1 developer bootstrap
├── contracts/
│   └── onboarding.yaml
├── checklists/      # UX flows, annotations, template copy
└── tasks.md         # Generated during Phase 2 (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/
├── frontend/
│   ├── src/app/(dashboard)/onboarding/        # Checklist routes + modal shell
│   ├── src/app/(dashboard)/templates/         # Template chooser + React Flow canvas bridge
│   ├── src/components/checklist/              # Stepper, disclosure panel, progress tracker
│   └── tests/                                 # Vitest + Playwright specs
├── backend/
│   ├── app/api/onboarding/                    # FastAPI routers + Pydantic models
│   ├── app/services/checklist_service.py      # Version + override orchestration
│   ├── app/services/telemetry_forwarder.py    # Supabase→Datadog bridge
│   └── tests/                                 # Pytest + contract fixtures
shared/
├── supabase/                                  # SQL migrations + RPC wrappers
└── ui/                                        # shadcn/ui tokens + Tailwind config

scripts/
├── verify-forwarder.sh                        # Datadog telemetry validation
└── seed-onboarding.ts                         # Seed templates + checklist steps
```

**Structure Decision**: Reuse the existing monorepo split under `apps/frontend` (Next.js 15) and `apps/backend` (FastAPI) so onboarding UI, API, and telemetry logic live beside their respective vertical slices while shared migrations/utilities remain under `shared/`.

## Complexity Tracking

No constitution violations or additional complexity beyond the approved stack were identified for this iteration.
