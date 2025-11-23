# Research Findings: OHLCV Ingestion v1 (Phase 0)

## Decisions

- Decision: Use Postgres range-partitioned tables (or well-indexed base tables) partitioned by day with indexes on (asset_symbol, bucket_start) for both minute and daily candles in the Supabase Postgres project.
  Rationale: Native Postgres partitioning provides the required compression and fast time-range queries now that the `timescaledb` extension is not available on Supabase Postgres 17; partitioning keeps writes efficient for backfill batches while supporting 3y+ retention.
  Alternatives considered: Plain single-table partitioning without indexes (too slow for large windows); BigQuery/Snowflake (out of scope for Supabase-hosted stack).

- Decision: Represent minute and daily candles in separate hypertables (`ohlcv_minute`, `ohlcv_day`) with a unique constraint on (asset_symbol, bucket_start, interval) to enforce idempotency.
  Rationale: Distinct hypertables simplify retention (90d vs 3y+), allow interval-specific compression policies, and the unique constraint prevents duplicates during retries.
  Alternatives considered: Single table with interval column (more complex retention/compression rules); partitioned inheritance (unneeded complexity for v1 scope).

- Decision: Compute per-run checksum as SHA256 over sorted canonicalized rows (asset_symbol, bucket_start, o,h,l,c,v,interval) and store alongside row_count in `ingestion_runs` and `lineage` references.
  Rationale: Matches clarification, supports reproducible validation and lineage queries for AC1/AC3.
  Alternatives considered: CRC32 (faster but weaker collision resistance); Merkle trees (overkill for 10 assets v1).

- Decision: Implement ingestion/backfill worker in Python 3.12 using FastAPI tasks + async HTTP client; orchestrate schedules via Supabase cron/queue (or containerized cron) with retry/backoff (e.g., exponential up to 5 attempts) and idempotent UPSERT writes.
  Rationale: Python chosen in active stack; async client handles vendor rate limits; Supabase cron keeps infra minimal and aligned with DB locality.
  Alternatives considered: Node.js worker (would duplicate Python runtime used elsewhere); Airflow (too heavy for v1 timeline).

- Decision: Alerting via email distribution list using Supabase functions or a lightweight webhook to an email service, triggered when freshness lag >60m on evaluation every 10m, deduplicated per incident.
  Rationale: Aligns FR-005/FR-007; email is guaranteed channel; dedup prevents alert storms.
  Alternatives considered: Slack/PagerDuty (not requested); SMS (higher cost, not required for v1).

- Decision: Status page data API will expose aggregated coverage/freshness metrics (latest timestamp, coverage windows, vendor state) and remediation log exports via FastAPI endpoints consumed by Next.js server components.
  Rationale: Keeps frontend thin and cacheable, and allows reuse for Playwright/API contract tests.
  Alternatives considered: Direct DB reads from Next.js (tighter coupling, harder to secure); GraphQL (unnecessary for simple aggregates).

- Decision: Observability via Datadog metrics/logs for job duration, rows ingested, lag minutes, alert counts; 30-day retention aligns with FR-010.
  Rationale: Constitution requires telemetry; Datadog already standard in stack.
  Alternatives considered: CloudWatch-only (less consistent with existing dashboards); logging without metrics (insufficient for budgets/SLOs).

- Decision: Accessibility/UX testing to include table a11y checks (caption, scope, keyboard focus) and Playwright a11y scan on status page.
  Rationale: Satisfies Constitution IV and FR-002/FR-004 UX acceptance.
  Alternatives considered: Manual-only checks (higher regression risk).
