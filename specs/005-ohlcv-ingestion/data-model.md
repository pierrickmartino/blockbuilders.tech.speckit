# Data Model: OHLCV Ingestion v1

## Entities

### Asset
- Fields: id (uuid, pk), symbol (text, unique, enum of BTC, ETH, SOL, USDC, USDT, AAVE, LINK, DOGE, BNB, XRP), name (text), base (text), quote (text), vendor_ref (text), created_at (timestamptz), updated_at (timestamptz).
- Validation: symbol must be in configured list; base/quote non-empty.
- Relationships: 1:N with OHLCV Candle, Lineage, Alert Event, Remediation Log.

### OHLCV Candle (minute/day)
- Tables: ohlcv_minute, ohlcv_day (Timescale hypertables partitioned by day).
- Fields: id (bigserial, pk), asset_symbol (text fk->asset.symbol), bucket_start (timestamptz, bucket-aligned), interval (enum: minute|day), open (numeric), high (numeric), low (numeric), close (numeric), volume (numeric), run_id (uuid fk->ingestion_run.id), source_vendor (text), fetched_at (timestamptz).
- Constraints: unique (asset_symbol, bucket_start, interval); check open/high/low/close >=0, volume >=0; bucket_start aligned to interval.
- Relationships: belongs to Asset; belongs to Ingestion Run; referenced by Lineage via run_id + bucket_start.

### Ingestion Run
- Fields: id (uuid, pk), asset_symbol (text fk->asset.symbol), interval (enum minute|day), started_at (timestamptz), ended_at (timestamptz), status (enum success|failed|partial), row_count (int), checksum_sha256 (text), checksum_version (smallint, default 1), error_summary (text), attempt (smallint), trigger (enum manual|scheduled), backfill_window_start (timestamptz), backfill_window_end (timestamptz).
- Constraints: ended_at >= started_at; attempt >=1.
- Relationships: 1:N to OHLCV Candle, Lineage, Remediation Log.

### Lineage Record
- Fields: id (uuid, pk), asset_symbol (text fk), bucket_start (timestamptz), interval (enum), run_id (uuid fk->ingestion_run.id), source_vendor (text), fetched_at (timestamptz), checksum_sha256 (text), checksum_version (smallint), created_at (timestamptz default now()).
- Constraints: unique (asset_symbol, bucket_start, interval); bucket alignment enforced; checksum must match ingestion run.
- Relationships: belongs to Ingestion Run and Asset.

### Remediation Log Entry
- Fields: id (uuid, pk), asset_symbol (text fk), interval (enum), range_start (timestamptz), range_end (timestamptz), issue_type (enum gap|duplicate|checksum_mismatch|partial_source), detected_at (timestamptz), run_id (uuid fk->ingestion_run.id), notes (text), resolved (boolean default false), resolved_at (timestamptz).
- Constraints: range_end >= range_start; issue_type enum.
- Relationships: belongs to Asset and Ingestion Run; exposed on status page and export.

### Alert Event
- Fields: id (uuid, pk), asset_symbol (text fk), interval (enum minute|day), detected_at (timestamptz), lag_minutes (int), threshold_minutes (int default 60), status (enum open|cleared), notified_at (timestamptz), cleared_at (timestamptz), notification_channel (enum email), run_id (uuid fk nullable).
- Constraints: lag_minutes >=0; threshold_minutes=60 for v1.
- Relationships: belongs to Asset; optional link to Ingestion Run that restored freshness.

### Vendor Status (optional cache table)
- Fields: vendor (text pk), status (enum up|degraded|down|rate_limited), checked_at (timestamptz), details (jsonb).
- Use: surface vendor availability on status page; can be view or table populated by health checks.

## Relationships Summary
- Asset 1:N OHLCV Candle, Lineage, Remediation Log, Alert Event.
- Ingestion Run 1:N OHLCV Candle and Remediation Log; 1:1 or 1:N with Lineage per interval; optional link to Alert Event resolution.
- Lineage unique per asset + bucket + interval, referencing Ingestion Run for reproducibility.

## State Transitions
- Ingestion Run: scheduled/manual → running → success | partial | failed. Partial triggers remediation entries; success writes checksums.
- Alert Event: open when lag_minutes > threshold at evaluation; cleared when lag drops below threshold for same asset/interval; deduplicate by asset+interval while open.
- Remediation Log: created on gap/duplicate/checksum_mismatch; resolved once data corrected and verified by checksum.

## Validation Rules
- Bucket alignment enforced via trigger or check: minute buckets aligned to UTC minute, daily to 00:00 UTC.
- Idempotent ingest: UPSERT with unique constraints on (asset_symbol, bucket_start, interval) for candles and lineage.
- Freshness calculation: compare now() to max(bucket_start) per asset/interval; alert when lag_minutes >60.
- Coverage windows: daily coverage = [min(bucket_start), max(bucket_start)] per asset in ohlcv_day; minute coverage limited to last 90 days by retention policy.
