# Onboarding Checklist Feature Guide

Last updated: 2025-11-15

## Purpose

Ship the 004 onboarding checklist MVP with the infrastructure required to satisfy FR-003 disclosure delivery and FR-011 locale approvals before any UI ships. This document complements `specs/004-onboarding-checklist/plan.md` and enumerates the runtime switches, local bootstrap steps, and secrets engineers must configure.

## Runtime Feature Flags

| Flag | Default | Scope | Description |
|------|---------|-------|-------------|
| `onboarding_checklist_v1` | disabled | Supabase `feature_flags` table | Gates the entire checklist modal, API, and telemetry fan-out (FR-003, FR-011). |
| `onboarding_templates_alpha` | disabled | Supabase `feature_flags` table | Enables starter template metadata seeding plus React Flow priming for US2. |

### How to enable

```bash
pnpm exec tsx scripts/seed-onboarding.ts --flags-only --workspace $WORKSPACE_ID
```

The seed runner upserts the flags into Supabase with the correct workspace scope. Include `ONBOARDING_CHECKLIST_FEATURE_FLAG` in your `.env` (added in T001).

## Local Supabase + Docker Workflow

1. `docker compose -f configs/compose/docker-compose.dev.yml up supabase`
2. Apply migrations from `shared/supabase/migrations` using the Supabase CLI or `psql`.
3. Run `pnpm exec tsx scripts/seed-onboarding.ts --bootstrap` to insert checklist defaults, disclosures, and feature-flag toggles.
4. Export `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` so both FastAPI and the seed runner point at the dockerised instance.

## Required Secrets (Quickstart Reference)

| Secret | Location | Used By | Notes |
|--------|----------|---------|-------|
| `SUPABASE_URL` | `.env`, `apps/frontend/.env.example`, `apps/backend/.env.example` | Frontend + backend + seeds | Points to dockerised Supabase during development. |
| `SUPABASE_SERVICE_ROLE_KEY` | `apps/backend/.env` | FastAPI + seed runner | Required for migrations, RPC calls, and version resets. |
| `NEXT_PUBLIC_DATADOG_CLIENT_TOKEN` | `.env.local` | Frontend telemetry | Allows client-side step/start events to reach Datadog via the forwarder. |
| `DATADOG_API_KEY` / `DATADOG_APP_KEY` | `apps/backend/.env` | `scripts/verify-forwarder.sh` | Used to validate Supabase→Datadog fan-out (FR-006). |
| `ONBOARDING_DISCLOSURE_BUCKET` | `.env`, Supabase storage | Seeds + CDN | Hosts locale-specific copy documented in `specs/004-onboarding-checklist/checklists/disclosures.md` (FR-003 compliance artifact). |

## Compliance References

- **FR-003 Disclosure Delivery** → `specs/004-onboarding-checklist/checklists/disclosures.md` (signed copy + locale coverage).
- **FR-011 Locale Approvals** → `docs/qa/onboarding-checklist.md` (reviewer table + evidence links). Both docs are linked from the QA checklist referenced by legal, satisfying the audit requirement prior to UI implementation.

