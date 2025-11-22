# Implementation Plan: Market Data Ingestion (OHLCV v1)

**Branch**: `005-ohlcv-ingestion` | **Date**: 2025-11-22 | **Spec**: `/specs/005-ohlcv-ingestion/spec.md`
**Input**: Feature specification from `/specs/005-ohlcv-ingestion/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Deliver v1 ingestion and monitoring for OHLCV (daily + minute) for 10 crypto assets: ETL to Timescale, checksum-backed backfill with retries/idempotency, freshness alerting (lag >60m, eval every 10m), and a Next.js status page exposing coverage, lineage, and remediation info.

## Technical Context

**Language/Version**: Node.js 20 (Next.js 15, React 19) for status page; Python 3.12 (FastAPI workers) for ingestion/ETL
**Primary Dependencies**: Next.js 15 App Router, Tailwind 3.4 + shadcn/ui, Supabase JS client; FastAPI + Pydantic v2; Supabase Postgres with TimescaleDB extension
**Storage**: Supabase Postgres/Timescale hypertables for ohlcv (minute/day), ingestion_runs, lineage, remediation logs
**Testing**: pnpm lint --max-warnings 0; pnpm type-check; pnpm test:coverage (Vitest/Playwright as needed); ruff check; uv run pytest
**Target Platform**: Frontend on Vercel/Next.js server runtime; backend workers on Linux containers (Supabase functions or FastAPI service) hitting Supabase DB
**Project Type**: Web + backend services
**Performance Goals**: Status page summary load ≤5s for 10 assets; API p95 ≤200ms for status/lineage endpoints; ingestion/backfill success ≥99% with retries; alert dispatch within 10 minutes of threshold breach
**Constraints**: Freshness threshold 60 minutes evaluated every 10 minutes; single vendor; idempotent writes with checksum per run; 10 assets fixed scope; daily coverage ≥3y, minute ≥90d
**Scale/Scope**: 10 assets, expected <2k daily rows/day and ~14.4k minute rows/asset/day; lineage retained for audit; telemetry for 30-day lookback

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality Without Compromise**: Will run `pnpm lint --max-warnings 0`, `pnpm type-check`, `pnpm test:coverage` for frontend; `ruff check` and `uv run pytest` for Python ingestion; peer review required before merge.
- **Simplicity Over Speculation**: All deliverables map to spec FR-001–FR-010; no additional assets or fallback vendors in v1; any new dependency must document why existing stack insufficient.
- **Test Evidence First**: Plan to author failing tests first: Vitest/Playwright for status page coverage/freshness display + stale flag filtering; contract tests for lineage/status endpoints; pytest for ingestion idempotency, checksum generation, and retry behavior; target ≥80% coverage maintained via CI.
- **Consistent Experience Every Time**: Use shared Tailwind tokens and shadcn primitives; ensure status page meets WCAG 2.2 AA with keyboard navigation and table a11y; align with `claude-nextjs-15.md` server/client boundaries.
- **Performance and Reliability Budgets**: Validate status page TTI/LCP within 2s/2.5s on reference device; API p95 ≤200ms via load test; ingestion telemetry exposes success rate, lag minutes, row counts; alerts monitored for single-fire behavior.

## Project Structure

### Documentation (this feature)

```text
specs/005-ohlcv-ingestion/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── app/
│   └── services/
└── tests/
```

**Structure Decision**: Use existing split `frontend/` (Next.js 15 App Router) for status page and `backend/` (FastAPI workers + ingestion jobs) for ETL, schemas, and APIs against Supabase/Timescale.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
