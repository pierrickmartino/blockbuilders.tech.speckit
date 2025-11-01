# Implementation Plan: Supabase Email Auth Integration

**Branch**: `002-supabase-email-auth` | **Date**: 2025-11-01 | **Spec**: specs/002-supabase-email-auth/spec.md  
**Input**: Feature specification from `specs/002-supabase-email-auth/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement Supabase email/password authentication across the Next.js 15 frontend and FastAPI backend, providing dedicated sign-up/sign-in flows, shared Supabase clients for server and client contexts, JWT-protected APIs, and environment onboarding docs so protected routes enforce email verification and persist sessions.

## Technical Context

**Language/Version**: TypeScript (Node.js 20 LTS), Python 3.12  
**Primary Dependencies**: Next.js 15 App Router, React 19, Supabase JavaScript client with Next.js auth helpers, FastAPI, Pydantic v2, planned Supabase Python/JWT tooling  
**Storage**: Supabase Postgres (hosted)  
**Testing**: Vitest unit tests, Playwright smoke/a11y flows, pnpm test:coverage, ruff check, uv run pytest with httpx, future Supabase client mocks  
**Target Platform**: Next.js 15 server-side rendering on Node 20 (Vercel-style runtime) and FastAPI served via Uvicorn workers  
**Project Type**: Web application with separate frontend (`apps/frontend`) and backend (`apps/backend`) services  
**Performance Goals**: Auth pages TTI ≤2s and LCP ≤2.5s; FastAPI `/me` and auth helpers p95 ≤200ms with cached JWKS lookups  
**Constraints**: Enforce httpOnly Supabase cookies, CSRF-aware form submits, email confirmation gating, cached JWKS validation, zero PII logging, environment secrets documented in `.env.example`  
**Scale/Scope**: Initial internal users and CI automation validating core auth flows across local, preview, and production environments

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality Without Compromise**: Frontend work will gate on `pnpm lint --max-warnings 0`, `pnpm type-check`, `pnpm test:coverage`, and `pnpm test:e2e`; backend changes run `ruff check .`, `uv run pytest`, and enforce ≥80% coverage. Security scan coverage includes dependency review of Supabase keys and lint rules from `claude-nextjs-15.md` and `claude-python.md`. Peer review will confirm adherence.
- **Simplicity Over Speculation**: Planned deliverables map directly to FR-101 through FR-110 and SC metrics in the spec. No new abstractions or dependencies will ship without documented ties to Supabase auth, JWT verification, or env onboarding; any out-of-scope ideas will be deferred.
- **Test Evidence First**: New failing tests include Vitest schemas for password policy (FR-102/102a), Playwright journeys for sign-up/sign-in/session persistence (FR-101, FR-104, FR-105a), and pytest suites for JWKS verification plus `/me` authorization (FR-106). Coverage thresholds remain ≥80%, and accessibility assertions run via `@axe-core/playwright`.
- **Consistent Experience Every Time**: Tailwind tokens and shared components guided by `claude-nextjs-15.md` will structure the `(auth)` routes; forms will satisfy WCAG 2.2 AA, keyboard navigation, focus management, and screen-reader labels validated during Playwright + axe checks and manual UX acceptance.
- **Performance and Reliability Budgets**: Auth flows target TTI ≤2s/LCP ≤2.5s measured with Next.js Web Vitals tooling; Supabase session helpers instrumented with telemetry ensure p95 ≤200ms for backend verification. Cached JWKS fetches prevent latency spikes, and CI smoke tests monitor regression.

*Post-Design Review (2025-11-01): PASS — Phase 0/1 artifacts confirm gates remain satisfied; no exceptions required.*

## Project Structure

### Documentation (this feature)

```text
specs/002-supabase-email-auth/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── [Phase 1 API contracts]
```

### Source Code (repository root)

```text
apps/
├── frontend/
│   ├── app/(auth)/                 # Sign-up, sign-in, verify email routes
│   ├── app/(protected)/            # Example protected page leveraging middleware
│   ├── app/api/                    # Route handlers sharing Supabase server client
│   ├── lib/supabase/               # Client/server helpers & auth middleware
│   ├── middleware.ts               # Next.js middleware enforcing auth redirect
│   └── tests/                      # Vitest unit and Playwright e2e suites
├── backend/
│   ├── app/api/auth/               # FastAPI router with `/me` protected endpoint
│   ├── app/services/supabase/      # JWT verification + JWKS cache utilities
│   └── tests/                      # Pytest unit/integration with Supabase mocks
shared/
└── configs/                        # Centralized env and secret templates
```

**Structure Decision**: Feature spans the existing web stack: Next.js resides at `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/frontend`, FastAPI lives at `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/apps/backend`, and supporting docs remain under `/Users/pierrickmartino/Developer/blockbuilders.tech.speckit/specs/002-supabase-email-auth`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
