# Feature Specification: Market Data Ingestion (OHLCV v1)

**Feature Branch**: `005-ohlcv-ingestion`  
**Created**: 2025-11-22  
**Status**: Draft  
**Input**: User description: "Title: 005-Market Data Ingestion (OHLCV v1) Why: Provide reliable historical data for backtests. Scope: • Frontend: Data status page (coverage, freshness, vendor status). • Backend: ETL for crypto OHLCV (minute/day), Timescale schema, integrity checks. • Infra: Scheduled jobs, retries, observability for lag/failures. Acceptance Criteria: • AC1 : Backfill N=10 assets to 3+ years daily and 90 days minute data with checksum reports. • AC2: Data freshness alert triggers if lag > X minutes. • AC3 : Data lineage (vendor, fetch time, checksum) queryable via API."

## Clarifications

### Session 2025-11-22

- Q: What freshness lag threshold and evaluation cadence should alerting use in v1? → A: Alert when lag exceeds 60 minutes with evaluation every 10 minutes.
- Q: What checksum method should we use for per-run integrity verification? → A: Use SHA256 over sorted OHLCV rows per asset and interval type for each backfill run.
- Q: Should v1 use a single vendor only or include fallback sourcing? → A: Single primary vendor only; no fallback in v1.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Monitor Coverage & Freshness (Priority: P1)

Data reliability owner views a data status page to confirm each configured asset has expected historical coverage and current freshness, with vendor/source status surfaced.

**Why this priority**: Visibility is the fastest way to detect gaps before they affect backtests and alerts; delivers immediate value even without automation changes.

**Independent Test**: Load status page with seeded data for 10 assets; verify coverage %, latest timestamp, and vendor state are displayed and exportable without running ingestion jobs.

**Acceptance Scenarios**:

1. **Given** 10 configured assets with historical OHLCV loaded, **When** a user opens the status page, **Then** they see for each asset the daily and minute coverage windows, most recent timestamp, and vendor availability.
2. **Given** an asset with a detected gap or stale data, **When** the page loads, **Then** the asset is flagged with severity, includes last successful load time, and can be filtered to show only problem assets.

---

### User Story 2 - Backfill with Checksums (Priority: P2)

Data engineer initiates or schedules backfill to populate 3+ years of daily and 90 days of minute OHLCV for 10 assets and receives a checksum report confirming completeness and integrity.

**Why this priority**: Backfill must complete before backtests are reliable; checksum proves integrity and satisfies AC1.

**Independent Test**: Trigger backfill in a test environment with known dataset; verify checksum report totals match source reference and lists any gaps/duplicates without needing alerts configured.

**Acceptance Scenarios**:

1. **Given** 10 assets configured, **When** backfill completes, **Then** a checksum report per asset summarizes row counts and hash for daily and minute data and highlights any missing intervals.
2. **Given** a checksum mismatch is detected, **When** the report is generated, **Then** the affected asset/day/minute range is listed for remediation and the report is accessible from the status page.

---

### User Story 3 - Freshness Alerting (Priority: P3)

On-call operator receives an alert when any asset’s latest OHLCV timestamp lags the expected schedule by more than the defined threshold.

**Why this priority**: Prevents silent data drift; keeps intraday freshness aligned with AC2.

**Independent Test**: Simulate delayed ingestion for one asset; verify an alert is sent within the detection window and includes asset, lag duration, and source info without requiring manual page checks.

**Acceptance Scenarios**:

1. **Given** an asset falls behind the 60-minute freshness threshold, **When** the 10-minute monitoring window elapses, **Then** an alert is sent once with asset id, lag minutes, and vendor status, and the status page shows matching stale state.
2. **Given** data resumes and catches up, **When** the system verifies freshness, **Then** the stale flag clears on the status page and no further alerts fire for that incident.

### Edge Cases

- Source returns partial intervals (e.g., missing minutes) within an otherwise successful run.
- Duplicate OHLCV rows for the same asset/timestamp appear during retries.
- Vendor downtime or rate limits prevent fetches for one or more assets.
- Daylight saving or calendar anomalies create short/long days affecting daily aggregation windows.
- Backfill interrupted mid-run; subsequent resume should avoid double-counting.
- API consumer requests lineage for a timestamp range with no stored data.
- Alert flapping when data oscillates around the freshness threshold.

## Requirements *(mandatory)*

### Functional Requirements

> Map each requirement to constitution principles (quality, simplicity, testing, experience, performance) and the evidence that will demonstrate compliance.

- **FR-001 (quality, testing)**: System MUST ingest daily and minute OHLCV for the configured 10 assets with target coverage of ≥3 years daily and ≥90 days minute history, producing a per-asset checksum report (row counts and SHA256 hash over sorted rows) after each backfill run.
- **FR-002 (quality, experience)**: Status page MUST display per-asset coverage windows, latest successful timestamp, vendor/source health, and highlight stale or gapped assets with filter/sort to surface issues quickly.
- **FR-003 (testing, quality)**: System MUST detect gaps, duplicates, or checksum mismatches and record them in a remediation log accessible via the status page and exportable for audits.
- **FR-004 (experience, performance)**: Status page MUST auto-refresh every 30s and provide a manual “Refresh” control (no full page navigation) that returns updated coverage/freshness within 2s, and load summarized coverage/freshness data with ≤2s Time-to-Interactive and ≤2.5s Largest Contentful Paint for the 10 assets, while status/lineage APIs sustain p95 latency ≤200ms; responses and UI MUST omit backend implementation details (no internal hostnames, credentials, or infrastructure identifiers) and expose only summarized fields.
- **FR-005 (quality, testing)**: Alerting MUST trigger when freshness lag exceeds 60 minutes, evaluated every 10 minutes, and send a single actionable notification per incident with asset id, lag duration, and last successful fetch time.
- **FR-006 (quality, simplicity)**: System MUST allow configuration of the v1 asset set: BTC, ETH, SOL, USDC, USDT, AAVE, LINK, DOGE, BNB, XRP; these 10 assets are the scope for backfill and monitoring.
- **FR-007 (experience, simplicity)**: Alert delivery channel MUST be a designated email distribution list and each alert MUST include: subject prefix for OHLCV ingestion, asset symbol, interval (day/minute), lag minutes, vendor status, incident id, run timestamp, and a deep link to the status page entry.
- **FR-008 (quality, testing)**: Data lineage API MUST return for any requested asset/time range the source vendor, fetch time, checksum id, and run identifier, enabling AC3 verification without revealing infrastructure specifics.
- **FR-009 (quality, performance)**: Ingestion jobs MUST be retryable with idempotent writes to avoid duplicate rows when reprocessing the same intervals.
- **FR-010 (testing, simplicity)**: Observability MUST include metrics/logs to confirm job success, duration, rows ingested, and alert counts; failures must be queryable for the past 30 days.

### Performance Budgets & Test Alignment

- Web Vitals: status page Time-to-Interactive ≤2s and Largest Contentful Paint ≤2.5s for 10 assets; validated via Playwright trace capture in tests T017 and T050.
- API latency: `/status/summary` and `/status/lineage` p95 ≤200ms for 10 assets; validated via load tests T016 and T016a with results recorded alongside the perf reports.

### Key Entities

- **Asset**: A tracked market instrument identified by symbol and metadata (name, base/quote), included in the configured set of 10.
- **OHLCV Candle**: Time-bucketed price/volume record (minute or day) tied to an asset, including open, high, low, close, volume, and interval timestamps.
- **Ingestion Run**: Execution instance of a fetch/backfill job with start/end times, outcome, row counts, and checksum summary.
- **Data Source**: Vendor or upstream feed from which OHLCV data is fetched, with current availability state and SLA notes.
- **Lineage Record**: Per-interval metadata linking OHLCV data to the ingestion run, source, checksum id, and fetch timestamp.
- **Alert Event**: Notification instance when freshness exceeds threshold, including asset id, lag minutes, detection time, and delivery status.
- **Remediation Log Entry**: Record of gaps, duplicates, or checksum mismatches for follow-up, linked to the affected asset and interval range.

### Assumptions

- Minute data retention beyond 90 days will follow the same freshness checks but may be trimmed later without changing v1 scope.
- Backfill can be triggered manually or by schedule; no user-facing scheduling UI is required in v1.
- Single primary data vendor is used for v1; no fallback vendor in scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-COVERAGE**: 100% of the defined 10 assets show contiguous coverage of at least 3 years (daily) and 90 days (minute) with zero gaps >1 interval; checksum reports for each run are available and match expected row counts.
- **SC-FRESHNESS**: 100% of assets remain within the 60-minute freshness threshold during steady-state; any breach generates an alert within 10 minutes of detection and is visible on the status page until resolved.
- **SC-LINEAGE**: Lineage API returns vendor, fetch time, checksum id, and run identifier for any asset/time query within stored ranges; responses include the most recent ingestion run reference.
- **SC-UX**: Status page meets ≤2s Time-to-Interactive and ≤2.5s Largest Contentful Paint on reference devices, while clearly flagging stale or gapped assets without requiring backend knowledge.
- **SC-RELIABILITY**: Ingestion/backfill jobs maintain a rolling 30-day success rate ≥99% with retries preventing duplicate OHLCV entries; telemetry and reports expose the 30-day calculation and underlying run data.
