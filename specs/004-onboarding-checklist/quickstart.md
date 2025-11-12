# Quickstart – Onboarding & First-Run Checklist

1. **Checkout the feature branch**
   ```bash
   git fetch origin 004-onboarding-checklist && git checkout 004-onboarding-checklist
   ```
   Install deps via `pnpm install` (root) and `uv sync` inside `apps/backend` if environments changed.

2. **Seed checklist + template fixtures**
   ```bash
   pnpm --filter @blockbuilders/frontend run db:seed onboarding-checklist
   uv run python apps/backend/app/scripts/seed_onboarding.py
   ```
   Seeds create `onboarding_checklists`, `checklist_step_progress` defaults for test users, and three starter templates with React Flow node JSON.

3. **Run the dev stack**
   ```bash
   pnpm --filter @blockbuilders/frontend dev
   uv run fastapi dev apps/backend/app/main.py
   ```
   Frontend auto-loads the checklist modal; backend exposes `/onboarding` and `/analytics` endpoints for local data persistence.

4. **Verify checklist + template flow**
   - Sign in with a fresh Supabase user, confirm four ordered steps render within 5 s.
   - Complete a disclosure step (modal requires acknowledgement) and refresh to ensure persistence.
   - Hit "Use template" → React Flow canvas should open with populated nodes/edges and immediately runnable draft.

5. **Validate telemetry + dashboards**
   ```bash
   pnpm --filter @blockbuilders/frontend test:onboarding-checklist
   uv run pytest apps/backend/tests/test_onboarding_events.py
   ```
   Ensure Datadog forwarder receives events (check local mock logs) and synthetic data populates the `FunnelMetricSnapshot` view for analytics stakeholders.
