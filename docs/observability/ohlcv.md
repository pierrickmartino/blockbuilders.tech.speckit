# Observability: OHLCV Ingestion v1

Last updated: 2025-11-22

## Dashboards & Alerts
- **Datadog dashboard**: create/read at `dashboards/ohlcv-ingestion` (rows: run success %, duration p95, rows ingested, freshness lag, alert counts). Wire CI to publish JSON once metrics are emitted.
- **Alerts**: page on freshness lag >60m (per asset/interval), ingestion failure spikes, and missing runs in the last 30 minutes.

## Metrics
- `ohlcv.ingestion.run`: counter tagged by `status` (`success|failed`), `interval` (`day|minute`), `trigger` (`manual|scheduled`), `asset_symbol` (`*` for batch runs).
- `ohlcv.ingestion.duration_ms`: histogram/gauge tagged by `interval`, `trigger`.
- `ohlcv.ingestion.rows`: gauge tagged by `interval`, `asset_symbol`.
- `ohlcv.ingestion.lag_minutes`: gauge tagged by `interval`, `asset_symbol`; computed from `backfill_window_end` vs now.
- `ohlcv.freshness.lag_minutes`: gauge tagged by `asset_symbol`, `interval`, sampled during the 10m freshness monitor.
- `ohlcv.alerts.created` / `ohlcv.alerts.cleared`: counters tagged by `asset_symbol`, `interval`; derive open incidents from `created - cleared`.
- `ohlcv.alerts.open`: gauge tagged by `asset_symbol`, `interval` (updated after each monitor run).

## Logs & Failure Tracing
- Log keys for dashboards: `ingestion_run_id`, `interval`, `status`, `rows`, `duration_ms`, `lag_minutes`, `error_summary`.
- Failure log (30d lookback) is exposed via the `/ingestion/failures` contract for dashboards and smoke tests; each entry includes `asset_symbol`, `interval`, `status`, `error_summary`, `started_at`, `ended_at`, `attempt`.

## Runbooks
1) **Ingestion failure spike**: open `/ingestion/failures` to confirm error summaries → check Datadog panels `ohlcv.ingestion.run{status:failed}` and `ohlcv.ingestion.duration_ms` for timeouts. Re-run with `trigger=manual` and verify `rows` counter increments.
2) **Freshness lagging asset**: dashboard panel `ohlcv.freshness.lag_minutes{asset_symbol:<asset>}`; confirm alert status on status page; if `ohlcv.alerts.open` stuck while lag=0, clear via `/alerts/test` to sanity-check email path.
3) **Missing runs**: monitor `ohlcv.ingestion.run` for the last 30 minutes; if zero, verify scheduler/cron and restart worker.

## CI Expectations
- Lint/type-check/tests (pnpm + pytest/ruff) must pass before deployment.
- Perf budget guardrails live in `.github/workflows/ohlcv.yml` (status/lineage p95 ≤200ms) and should be viewed alongside the metrics above.
