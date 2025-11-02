# Quickstart Walkthrough

Follow this validated flow to bootstrap the mono-repo, exercise both services, and confirm quality gates. Evidence captured from CI runs is referenced so you can compare local execution against recorded timings.

## 1. Prerequisites

- Node.js 20.11+ (`node --version`)
- pnpm 9.x (`corepack enable pnpm`)
- Python 3.12 with [`uv`](https://github.com/astral-sh/uv)
- Docker Desktop ≥ 4.33 (Compose V2)
- Playwright browsers (`npx playwright install --with-deps`)

## 2. Repository Setup

```bash
pnpm install --frozen-lockfile
uv sync
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/backend/.env.example apps/backend/.env
```

Populate the environment files with:

- `NEXT_PUBLIC_APP_ENV` (`local`, `ci`, `staging`, `production`)
- `APP_VERSION` (optional override)
- `SERVICE_PORT` (defaults to `8000`)

## 3. Run the Services

```bash
pnpm --filter @blockbuilders/frontend... dev             # http://localhost:3000
uv run fastapi dev apps/backend/app/main.py --reload     # http://localhost:8000/health
```

For a containerized experience:

```bash
docker compose -f configs/compose/docker-compose.dev.yml up --build
```

Use `docker compose ... logs <service>` if health checks fail; see `docs/TROUBLESHOOTING.md` for remedies.

## 4. Quality Gates

```bash
pnpm --filter @blockbuilders/frontend... lint
pnpm --filter @blockbuilders/frontend... type-check
pnpm --filter @blockbuilders/frontend... test:coverage
pnpm --filter @blockbuilders/frontend... test:e2e -- --project smoke

uv run ruff check apps/backend
uv run pytest --cov=app --cov-report=term-missing
```

Timings and latencies captured during recent verification runs are recorded in:

- `configs/ci/reports/test-metrics.md` — lint/test durations and `/health` latency
- `configs/ci/reports/frontend-performance.md` — Next.js build metrics and Playwright trace status
- `configs/ci/reports/container-start-times.md` — compose health-check durations

Compare your local output with the recorded metrics to catch regressions early. Playwright and container timing entries are currently marked `n/a`; update the reports after the first GitHub Actions executions populate artifacts.

## 5. Session Diagnostics & Recovery

- **Cookie fallback**: The Supabase session layer defaults to httpOnly cookies. When testing browsers that block third-party cookies, switch the client to in-memory mode by calling `setBrowserSupabaseStorageMode('memory')` from `@/lib/supabase/clients`. Restore the default with `setBrowserSupabaseStorageMode('cookies')` after verifying behaviour. For ad-hoc debugging (e.g., in Playwright traces), you can also invoke `window.__supabaseSessionTestHooks?.setCookiesEnabled(false)` in the DevTools console.
- **Outage signalling**: The session provider emits a `supabase-session-outage` `CustomEvent` with `{ delay, attempts, message }` while exponential backoff retries are queued. Listen to this event to surface operator toasts or forward diagnostics to your observability stack.
- **Performance snapshots**: Use the exposed runtime hooks (`window.__supabaseSessionTestHooks?.collectMetrics()`, `.logMetrics()`, `.getLastMetrics()`) to capture time-to-first-byte, LCP, and Supabase latency metrics when reproducing expiry flows. The Playwright `auth-session` suite exercises the same helpers as evidence.

## 6. Next Steps

- Commit updated evidence files when metrics change materially.
- Archive troubleshooting findings in `docs/TROUBLESHOOTING.md` to keep resolutions close to the workflows above.
