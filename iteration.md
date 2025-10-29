* **I-00: Sprint 0 Readiness (Go/No-Go)**

  * Goal: Satisfy conditional preconditions to start delivery.
  * Scope: Market data contract + fallback runbook verified; freemium quota manifest finalized; compliance dry-run scheduled; Datadog cost dashboards live.
  * Done: All four Sprint-0 gates marked “Complete” in ops log; secrets vaulted; status page up; escalation runbook linked.

* **I-01: Monorepo & CI/CD Foundation**

  * Goal: Ship a runnable skeleton to enable fast iteration.
  * Scope: Next.js (App Router, TS, Tailwind) + FastAPI services; shared schema package; pnpm/uv setup; Dockerfiles/compose; GitHub Actions (lint/test/build); basic health checks.
  * Done: `pnpm dev` and `uvicorn` both green locally & in CI; README bootstrap guide; smoke tests passing.

* **I-02: Auth & Workspace Bootstrap**

  * Goal: Let users sign up and land in a safe starter workspace.
  * Scope: Supabase email/password + OAuth; simulation-only consent; post-login creates demo workspace with sample blocks; auth audit logs.
  * Done: New user flow to canvas in ≤2 clicks; auth events logged; e2e happy path passes.

* **I-03: Canvas MVP (Blocks, Links, Validation)**

  * Goal: Enable non-coders to assemble first executable strategy graph.
  * Scope: React Flow canvas; 5 starter block types; connect/delete/undo; side-panel config; inline validation badges; autosave + version history.
  * Done: Build a simple BTC-USD strategy end-to-end; version revert works; keyboard accessibility basics pass.

* **I-04: Guided Onboarding & Starter Templates**

  * Goal: Drive “first backtest in 15 minutes”.
  * Scope: Onboarding checklist; 3 starter strategies with tooltips; education hub snippets; analytics events for activation.
  * Done: ≥65% of test users complete the checklist in dogfood; events visible in dashboards.

* **I-05: Market Data Ingestion v1 (Primary Vendor)**

  * Goal: Reliable historical/hourly data for backtests.
  * Scope: TimescaleDB schema; ingest BTC-USD/ETH-USD from CoinDesk; hourly ETL; freshness/coverage metrics; anomaly logging.
  * Done: 12+ months hourly OHLCV loaded; freshness SLO visible; alert fires on lag.

* **I-06: Market Data Fallback & Runbook Automation**

  * Goal: Operational resilience to vendor incidents.
  * Scope: Coin Metrics failover path; feature flag to swap source; swap scripts; status page hooks; secrets rotation cadence.
  * Done: Drill completes in ≤10 minutes; rollback verified; ops log entry created.

* **I-07: Backtest Engine v1 (Deterministic)**

  * Goal: Turn strategy graphs into deterministic simulations.
  * Scope: Graph → executable payload; worker service; fees/slippage settings; queueing; equity curve, drawdown, trade ledger outputs.
  * Done: Standard run ≤30s p50 / ≤45s p95; artifacts stored and queryable; retry semantics documented.

* **I-08: Results UI & Exports**

  * Goal: Make outcomes interpretable and shareable.
  * Scope: KPIs, charts, trade logs; run metadata; CSV/PDF export; WCAG AA for charts.
  * Done: Side-by-side view for current vs prior run; export verified via download + email link.

* **I-09: Paper Trading Scheduler v1**

  * Goal: Continuous simulation without capital risk.
  * Scope: Schedule frequencies; exchange + capital inputs; execution logs; simulated fills; run status lifecycle.
  * Done: First schedule created from a strategy; runs execute on cadence; logs visible in UI.

* **I-10: Notifications & Alerting**

  * Goal: Keep users informed and engaged.
  * Scope: In-app notification center; SendGrid email delivery; compliance footers; unsubscribe; alert types for run completion/failure.
  * Done: Delivery metrics in Datadog; bounce handling; user can mute categories.

* **I-11: Freemium Quotas (Read-Only Enforcement)**

  * Goal: Establish plan boundaries before billing.
  * Scope: Usage counters (strategies, backtests/day, schedules); soft-limit banners at 70%/85%; hard stop with plan comparison.
  * Done: Limits enforced in UI/API; instrumentation logs upgrade intent.

* **I-12: Stripe Billing & Entitlements**

  * Goal: Convert and unlock premium features.
  * Scope: Checkout + customer portal; webhooks with replay protection; entitlement propagation; receipts/audit export.
  * Done: Upgrade flips quotas in ≤60s; finance export passes review.

* **I-13: Observability & SLOs**

  * Goal: See and fix issues fast within budget.
  * Scope: Centralized logs/traces/metrics; SLOs for backtest latency, ETL freshness, webhook failures; on-call paging; cost dashboards.
  * Done: Alerts page on-call within 5 minutes; weekly SLO report generated.

* **I-14: Compliance & Trust Framework**

  * Goal: “Simulation only / not financial advice” everywhere.
  * Scope: Disclosure snippets system; risk review workflow for high-risk templates; moderation hooks for published content.
  * Done: Copy lint checks in CI; approvals recorded; spot audit passes.

* **I-15: Accessibility & Performance Pass**

  * Goal: Meet NFR2 and WCAG AA.
  * Scope: Keyboard canvas interactions; focus management; chart alt text; TTI <2s on broadband; bundle analysis and fixes.
  * Done: Axe audits clean for core flows; synthetic TTI budgets enforced in CI.

* **I-16: Data Catalog & Transparency**

  * Goal: Build user trust in data quality.
  * Scope: UI for coverage/freshness; known issues; vendor status; cost usage guardrails.
  * Done: Catalog linked from backtest results; anomalies cross-referenced.

* **I-17: Strategy Comparison Gallery (MVP-Lite)**

  * Goal: Compare results to iterate faster.
  * Scope: Select up to 3 runs; KPI deltas; saved views.
  * Done: Users can pin comparisons and restore them; exports include both runs.

* **I-18: Beta Hardening & Release Readiness**

  * Goal: Private beta to 250 testers with stability.
  * Scope: Seed data workflow; status page; runbooks in `ops/playbooks/`; rollback rehearsals; support intake + SLAs.
  * Done: 1-week beta burn-in without Sev-1; rollback drill documented.

* **I-19: Educator Template Publishing (Post-MVP)**

  * Goal: Shareable learning assets.
  * Scope: Publish flow with metadata/attribution; clone with annotations; manual review queue; activity logs.
  * Done: Educator role can publish and track clones; moderation notes stored.

* **I-20: Cohort Monitoring (Phase 2)**

  * Goal: Support communities at scale.
  * Scope: Cohort tagging; aggregated paper-trade KPIs; exportable reports; privacy guardrails.
  * Done: Cohort dashboards populated; exports reviewed for compliance.

* **I-21: Insight Engine & Anomaly Explanations (Phase 3)**

  * Goal: Guide users with actionable insights.
  * Scope: Heuristics for drawdown/risk flags; suggestion cards; links to education.
  * Done: Insight accuracy validated on test set; opt-out controls available.

* **I-22: Cost Guardrails & Autoscaling (Continuous)**

  * Goal: Stay within $8K/month infra budget.
  * Scope: Worker HPA policies; queue back-pressure; budget alerts at 80%; monthly cost report.
  * Done: Load test scenarios mapped to cost; throttling playbook exercised.

* **I-23: Admin & Plan Management Console**

  * Goal: Operate the platform safely.
  * Scope: Manage data connectors, plan settings, disclosures; role-based access; audit trails.
  * Done: Admin actions fully audited; break-glass procedures tested.

* **I-24: GA Readiness & KPI Gate**

  * Goal: Graduate from beta when KPIs hold.
  * Scope: Activation/time-to-value/engagement/trust scorecards; three-week rolling validation; GA checklist.
  * Done: All MVP KPIs meet targets for 3 consecutive weeks; GA go-decision recorded.
