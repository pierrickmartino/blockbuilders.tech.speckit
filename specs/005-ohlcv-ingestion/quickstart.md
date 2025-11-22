# Quickstart: OHLCV Ingestion v1

## Prerequisites
- Node.js 20, pnpm installed
- Python 3.12 with `uv`
- Supabase project with TimescaleDB enabled (or local Postgres+Timescale)
- Datadog API key for metrics if available

## Setup
1. Install dependencies  
   - Frontend: `cd apps/frontend && pnpm install`  
   - Backend: `uv sync --directory apps/backend`
2. Wire environment files  
   - Backend: `cp apps/backend/.env.example apps/backend/.env` and set Supabase URL + service role key, database DSN (Timescale), fixed asset list, Datadog keys (`DATADOG_API_KEY`, `DATADOG_APP_KEY`, `DATADOG_SITE`), alert email distribution list, and vendor API credentials.  
   - Frontend: `cp apps/frontend/.env.local.example apps/frontend/.env.local` and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `STATUS_API_BASE_URL` (FastAPI base, e.g., `http://localhost:8000`).
3. Enable TimescaleDB  
   - Supabase: enable the TimescaleDB extension in the project SQL editor (`create extension if not exists timescaledb;`) and confirm `timescaledb.telemetry_level` is set as needed.  
   - Local Postgres: ensure `shared_preload_libraries = 'timescaledb'`, restart Postgres, then run the extension creation statement above.
4. Apply DB schema (Timescale hypertables, indexes, policies) under `apps/backend/app/models/migrations` (already committed for v1).
5. Seed fixtures (optional for local verification)  \
   - Deterministic dataset lives in `apps/backend/tests/fixtures/ohlcv_seed.py`. Emit a CSV you can `copy` into Timescale:  \
     ```bash
     uv run --directory apps/backend python - <<'PY' > /tmp/ohlcv_seed.csv
     import csv, sys
     from tests.fixtures.ohlcv_seed import SEED_CANDLES

     writer = csv.writer(sys.stdout)
     writer.writerow(["asset_symbol","bucket_start","interval","open","high","low","close","volume","source_vendor","fetched_at"])
     for interval, candles in SEED_CANDLES.items():
         for candle in candles:
             writer.writerow([
                 candle.asset_symbol,
                 candle.bucket_start.isoformat(),
                 interval.value,
                 candle.open,
                 candle.high,
                 candle.low,
                 candle.close,
                 candle.volume,
                 candle.source_vendor,
                 candle.fetched_at.isoformat(),
             ])
     PY
     ```
   - Load with psql: `psql $DATABASE_URL -c "\copy ohlcv_day (asset_symbol,bucket_start,interval,open,high,low,close,volume,source_vendor,fetched_at) FROM '/tmp/ohlcv_seed.csv' CSV HEADER"` (repeat for `ohlcv_minute` as needed).
   - Alternatively trigger the API backfill to compute checksums: `curl -X POST http://localhost:8000/ingestion/backfill -H 'Content-Type: application/json' -d '{"interval":"day"}'`.

## Running
- Frontend status page: `cd apps/frontend && pnpm dev` (Next.js 15).
- Ingestion/ETL service: `cd apps/backend && uv run fastapi dev app/main.py` or run the scheduled worker container executing backfill/ingest tasks.
- Trigger backfill: `curl -X POST http://localhost:8000/ingestion/backfill -H 'Content-Type: application/json' -d '{"interval":"day"}'`.
- Get ingestion run details + checksum: `curl http://localhost:8000/ingestion/runs/{run_id}`.
- Verify freshness alert email wiring: `curl -X POST http://localhost:8000/alerts/test -H 'Content-Type: application/json' -d '{"email":"you@example.com"}'` (uses the configured distro list + template).
- View status summary: `curl http://localhost:8000/status/summary`; remediation export: `curl http://localhost:8000/status/remediation`; lineage window: `curl 'http://localhost:8000/lineage?asset=BTC&interval=minute&start=2024-02-01T00:00:00Z&end=2024-02-01T01:00:00Z'`.

## Testing & Quality Gates
- Frontend: `pnpm lint --max-warnings 0 && pnpm type-check && pnpm test:coverage` (include Playwright a11y/perf projects for status page).
- Backend: `uv run --directory apps/backend ruff check app tests && uv run --directory apps/backend pytest` (idempotency/retry + checksum/failure-log coverage).
- Performance: run light load test on `/status/summary` to verify p95 ≤200ms for 10 assets; track telemetry via Datadog gauges.

## Deployment Notes
- Deploy frontend to Vercel/Next.js server runtime.
- Deploy FastAPI service and scheduled workers close to Supabase DB to minimize latency; use Supabase cron/queue for 10-minute freshness checks.
- Configure email distribution list for alerts and verify `/alerts/test` endpoint sends a single notification.
