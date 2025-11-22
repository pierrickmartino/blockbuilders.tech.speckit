# Quickstart — 004 Onboarding & First-Run Checklist

## Prerequisites
1. Node.js 20 LTS + `pnpm@9` installed.
2. Python 3.12 with `uv` and `poetry` plugins enabled.
3. Supabase service key + anon key in `.env.local` and `apps/backend/.env`.
4. Datadog API + app keys configured for the event forwarder tests.

## Setup
```bash
pnpm install
uv sync --project apps/backend
```

## Running the Feature Locally
1. **Start Supabase/Postgres** via `docker compose up supabase` (see `/configs/supabase/docker-compose.yml`).
2. **Backend**: `cd apps/backend && uv run fastapi dev app/main.py`.
3. **Frontend**: `cd apps/frontend && pnpm dev` — confirm checklist modal loads at `/dashboard` for seeded user `newbie@example.com` and selecting "Use template" opens the React Flow canvas with primed nodes/edges.
4. Enable feature flag `onboarding_checklist_v1` in Supabase `feature_flags` table for your workspace.

## Testing Workflow
1. Frontend unit + integration: `cd apps/frontend && pnpm test` (Vitest) followed by `pnpm test:e2e` (Playwright) to cover step order, template edits, overrides, and React Flow canvas hydration after template selection.
2. Backend quality gates: `cd apps/backend && ruff check && uv run pytest tests` (includes contract suite verifying version resets + telemetry persistence).
3. Accessibility: `pnpm test:a11y` from repo root to run axe CI against the checklist modal.
4. Telemetry pipeline: Run `scripts/verify-forwarder.sh onboarding` to assert Supabase events reach Datadog with cohort tags.

## Deployment Checklist
- Promote database migrations adding `checklist_version`, `template_diff`, and `override_reason` columns.
- Run `pnpm build` (frontend) and `uv run python scripts/export_openapi.py` (backend) prior to merge.
- Update Datadog monitors `onboarding-checklist-latency` and `onboarding-forwarder-errors` with new tags.
