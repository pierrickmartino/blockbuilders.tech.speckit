# Quickstart: OHLCV Ingestion v1

## Prerequisites
- Node.js 20, pnpm installed
- Python 3.12 with `uv`
- Supabase project with TimescaleDB enabled (or local Postgres+Timescale)
- Datadog API key for metrics if available

## Setup
1. Install JS deps: `cd frontend && pnpm install`.
2. Install Python deps: `cd backend && uv sync` (uses `pyproject.toml`).
3. Configure environment: set Supabase URL/key and Datadog creds in `.env.local` (frontend) and `.env` (backend).
4. Apply DB schema (Timescale hypertables, indexes, policies) via migration scripts under `backend/src/models` (to be added in implementation).

## Running
- Frontend status page: `cd frontend && pnpm dev` (Next.js 15).
- Ingestion/ETL service: `cd backend && uv run fastapi dev` or run scheduled worker container executing backfill/ingest tasks.
- Trigger backfill: `curl -X POST http://localhost:8000/ingestion/backfill -d '{"interval":"day"}'`.
- View status summary: `curl http://localhost:8000/status/summary` and open frontend page to consume same API.

## Testing & Quality Gates
- Frontend: `pnpm lint --max-warnings 0 && pnpm type-check && pnpm test:coverage` (include Playwright for status page a11y/filtering behavior).
- Backend: `ruff check` and `uv run pytest` (include idempotency/retry tests + checksum validation).
- Performance: run light load test on `/status/summary` to verify p95 ≤200ms for 10 assets.

## Deployment Notes
- Deploy frontend to Vercel/Next.js server runtime.
- Deploy FastAPI service and scheduled workers close to Supabase DB to minimize latency; use Supabase cron/queue for 10-minute freshness checks.
- Configure email distribution list for alerts and verify `/alerts/test` endpoint sends a single notification.
