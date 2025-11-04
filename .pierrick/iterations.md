Title: Bootstrap Monorepo with Spec-Kit & Foundations
Why: Establish a spec-driven baseline so all work flows from approved specs and CI.
Scope:
	•	Frontend: Initialize Next.js app shell with routing, layout scaffold, error boundary, and placeholder pages.
	•	Backend: Initialize FastAPI service with healthcheck, version endpoint, and Pydantic settings.
	•	Infra: Initialize spec-kit structure (/specs, /plans, /tasks), GitHub Actions CI, pnpm/Turborepo, pre-commit, Dockerfiles, devcontainers.
Acceptance Criteria:
	•	AC1 : CI runs lint, typecheck, test on PRs and blocks on failure.
	•	AC2: /healthz returns 200 with version/hash; frontend renders base layout at /.
	•	AC3 : Spec documents for Brief, PRD, Architecture, and Frontend Spec live in repo and are referenced in README.

Title: Auth & Accounts (Supabase)
Why: Gate features, enable personalization, and enforce RLS/quotas.
Scope:
	•	Frontend: Sign up/in, magic link, OAuth, profile dropdown, protected route guard, basic settings page.
	•	Backend: User profile model, webhooks for auth events, session validation middleware.
	•	Infra: Supabase project, RLS policies, service keys/secret management, local/staging envs.
Acceptance Criteria:
	•	AC1 : Users can sign up with email + magic link and OAuth provider; protected page redirects unauthenticated users.
	•	AC2: RLS prevents cross-tenant reads/writes in staging; automated tests validate policies.
	•	AC3 : Auth events captured in audit log table and visible in admin console.

Title: Design System & Tokens
Why: Ensure accessible, consistent UI and faster delivery.
Scope:
	•	Frontend: Set design tokens (color/typography/spacing), base components (Button, Input, Select, Modal, Toast), dark mode, WCAG AA defaults.
	•	Backend: Serve feature flag for theme experiments.
	•	Infra: Storybook with a11y, Chromatic/visual tests in CI.
Acceptance Criteria:
	•	AC1 : Storybook shows tokens and components with a11y checks passing.
	•	AC2: Visual regression job runs in CI and fails on diffs above threshold.
	•	AC3 : Keyboard navigation and focus states meet WCAG AA on core components.

Title: Onboarding & First-Run Checklist
Why: Drive time-to-first-backtest under 15 minutes.
Scope:
	•	Frontend: Guided checklist, progress tracker, starter template selection, inline disclosures.
	•	Backend: Track onboarding state, event telemetry endpoints.
	•	Infra: Analytics events schema, dashboards for funnel.
Acceptance Criteria:
	•	AC1 : New user sees checklist with at least 4 steps and completion persists across sessions.
	•	AC2: Selecting a starter template primes a draft strategy in the canvas.
	•	AC3 : Funnel dashboard shows step completion rates by cohort.

Title: Market Data Ingestion (OHLCV v1)
Why: Provide reliable historical data for backtests.
Scope:
	•	Frontend: Data status page (coverage, freshness, vendor status).
	•	Backend: ETL for crypto OHLCV (minute/day), Timescale schema, integrity checks.
	•	Infra: Scheduled jobs, retries, observability for lag/failures.
Acceptance Criteria:
	•	AC1 : Backfill N=10 assets to 3+ years daily and 90 days minute data with checksum reports.
	•	AC2: Data freshness alert triggers if lag > X minutes.
	•	AC3 : Data lineage (vendor, fetch time, checksum) queryable via API.

Title: Strategy Canvas (Graph Editor v1)
Why: Enable no-code strategy construction.
Scope:
	•	Frontend: Drag-drop nodes (Indicators, Conditions, Entry/Exit), ports, validation hints.
	•	Backend: Strategy schema (JSON), save/load APIs, server validation.
	•	Infra: Persisted document storage with RLS; snapshots/versioning table.
Acceptance Criteria:
	•	AC1 : User can build a 3-node strategy and save/load without errors.
	•	AC2: Invalid connections show inline errors and are rejected by API with helpful messages.
	•	AC3 : Strategy versions are recorded and diffable.

Title: Validation & Pre-Flight Checks
Why: Reduce runtime errors and guide confident execution.
Scope:
	•	Frontend: Pre-flight panel with warnings/errors, “Ready to run” state.
	•	Backend: Static/dynamic checks (data availability, parameter ranges, look-ahead bias guard).
	•	Infra: Rules engine config, feature flags for new checks.
Acceptance Criteria:
	•	AC1 : Strategies with missing data or invalid params cannot start; reasons displayed.
	•	AC2: All checks logged with code and remediation tips.
	•	AC3 : Unit tests cover ≥90% of validation paths.

Title: Backtest Engine v1 (Single Asset, Daily)
Why: Turn strategies into measurable results.
Scope:
	•	Frontend: Run button, job status, results view (equity curve, PnL, drawdown, basic stats).
	•	Backend: Celery workers, FastAPI job queue APIs, Timescale results schema.
	•	Infra: Redis for queue, worker autoscaling config, job TTL/retention.
Acceptance Criteria:
	•	AC1 : A daily-bar backtest completes under 60s for a 3-year window on a starter template.
	•	AC2: Results persist and are re-loadable; equity curve matches deterministic reference.
	•	AC3 : Job retries/backoff work; failed runs surface errors to UI.

Title: Results Comparison Dashboard
Why: Support evidence-based iteration.
Scope:
	•	Frontend: Compare up to 3 runs: equity, drawdown, heatmap, trade list. Export CSV.
	•	Backend: Aggregation endpoints for KPIs, benchmark overlay.
	•	Infra: Timescale continuous aggregates for KPIs, CDN caching for charts.
Acceptance Criteria:
	•	AC1 : Users can select multiple runs and see synchronized charts.
	•	AC2: KPI deltas compute server-side and match snapshot tests.
	•	AC3 : CSV export downloads within 2s for 10k trades.

Title: Templates Library & Starter Strategies
Why: Accelerate first wins and standardize patterns.
Scope:
	•	Frontend: Templates gallery with tags, preview, “Use Template”.
	•	Backend: CRUD endpoints, governance flags (reviewed/owner).
	•	Infra: Seed scripts to load curated templates; RLS per tenant.
Acceptance Criteria:
	•	AC1 : Users can browse and clone approved templates.
	•	AC2: Non-approved templates are hidden or marked clearly.
	•	AC3 : Seeds load on staging with checksum verification.

Title: Backtest Engine v2 (Multi-Asset, Minute Bars)
Why: Increase realism and depth for advanced users.
Scope:
	•	Frontend: Parameterization UI for universes and timeframe; progress with ETA.
	•	Backend: Portfolio simulation (cash, fees, slippage), minute bars pipeline.
	•	Infra: Worker pool sizing, memory limits, result compression.
Acceptance Criteria:
	•	AC1 : Multi-asset minute backtest succeeds on a 5-asset universe and persists portfolio metrics.
	•	AC2: Fee/slippage settings affect outcomes predictably (tests).
	•	AC3 : Resource limits prevent OOM; long jobs are cancellable.

Title: Paper Trading Scheduler v1
Why: Let users rehearse strategies on live data safely.
Scope:
	•	Frontend: Schedule UI, run history, alert preferences.
	•	Backend: Live data poller, order simulator, schedule/cron service.
	•	Infra: Time-based triggers, idempotent runs, clock skew guards.
Acceptance Criteria:
	•	AC1 : Users can schedule a strategy hourly/daily and see executions logged.
	•	AC2: Simulated orders/trades recorded with timestamps and price sources.
	•	AC3 : Missed runs are detected and recovered on next tick.

Title: Notifications & Alert Center
Why: Close the loop with actionable signals.
Scope:
	•	Frontend: In-app inbox, toast pipeline, alert ack flows.
	•	Backend: Notification service (types, routing), email/webhook providers.
	•	Infra: Provider keys, retry policy, user preferences with RLS.
Acceptance Criteria:
	•	AC1 : Users receive alerts for scheduled runs and threshold breaches.
	•	AC2: Acknowledgements persist and suppress duplicates per user.
	•	AC3 : Email/webhook deliveries have success/failure telemetry.

Title: Billing & Plan Quotas (Stripe)
Why: Monetize and enforce fair usage.
Scope:
	•	Frontend: Pricing page, upgrade flow, quota indicators.
	•	Backend: Stripe checkout/webhooks, quota enforcement middleware.
	•	Infra: Plan/entitlements tables, RLS on usage records, webhook reliability.
Acceptance Criteria:
	•	AC1 : Users can upgrade/downgrade; state reflects within 1 minute.
	•	AC2: Quota limits block excess runs with clear messaging.
	•	AC3 : Webhook replay safety verified; double-charge prevented.

Title: Admin & Support Console
Why: Operate the product and support users effectively.
Scope:
	•	Frontend: Admin dashboards (users, runs, alerts), impersonation with audit trail.
	•	Backend: Admin APIs, audit log queries, support notes.
	•	Infra: Role management (admin/support), SSO for staff.
Acceptance Criteria:
	•	AC1 : Admins can search users and view activity safely within RLS constraints.
	•	AC2: Impersonation actions are logged with actor and reason.
	•	AC3 : Support notes are tenant-scoped and immutable.

Title: Compliance & Disclosures
Why: Reduce legal risk and build trust through transparency.
Scope:
	•	Frontend: Persistent disclosures, data lineage tooltips, cookie consent, export disclaimers.
	•	Backend: Disclosure registry, immutable logs for user acknowledgements.
	•	Infra: Versioned copy management, retention policies.
Acceptance Criteria:
	•	AC1 : Disclosures render on all result pages and are not dismissible permanently.
	•	AC2: User acceptance events are stored immutably and queryable.
	•	AC3 : Cookie consent honors preferences across sessions.

Title: Observability & Run Reliability
Why: Detect, debug, and meet SLOs.
Scope:
	•	Frontend: Sentry browser SDK, error boundaries with DSN wiring.
	•	Backend: OpenTelemetry tracing, Datadog APM, structured logs.
	•	Infra: Synthetic checks for key routes/APIs, on-call alerts.
Acceptance Criteria:
	•	AC1 : Traces link frontend action → API → worker → DB for a backtest.
	•	AC2: Synthetic checks fail CI on regression; alerts page shows incidents.
	•	AC3 : P95 run latency and error rate dashboards exist with thresholds.

Title: Performance & Caching
Why: Keep UX snappy and costs controlled.
Scope:
	•	Frontend: React Query caching, pagination/virtualization for tables.
	•	Backend: Read replicas, query optimization, Timescale continuous aggregates.
	•	Infra: CDN caching for static/assets, Redis caches with TTL and stampede protection.
Acceptance Criteria:
	•	AC1 : Key pages TTI < 2s on median network; table scrolling stays > 55 FPS.
	•	AC2: API P95 latency for read endpoints < 200ms under load test.
	•	AC3 : Cache hit rate ≥ 70% on metrics endpoints.

Title: RBAC & Access Policies
Why: Protect sensitive data and enable educator roles.
Scope:
	•	Frontend: Role-aware UI guards and feature toggles.
	•	Backend: Role claims, policy checks on all endpoints, educator/shared workspace models.
	•	Infra: RLS extensions/tests for shared assets.
Acceptance Criteria:
	•	AC1 : Admin, Educator, User roles exposed in JWT and enforced server-side.
	•	AC2: Shared template workspaces function without cross-tenant leaks.
	•	AC3 : Automated policy tests cover all critical endpoints.

Title: Export, Share & Read-Only Links
Why: Encourage collaboration without risking edits.
Scope:
	•	Frontend: Share modal, read-only strategy/run views, export JSON/CSV.
	•	Backend: Signed link generation, scope-limited tokens with expiry.
	•	Infra: Rate limits, link revocation, download CDN.
Acceptance Criteria:
	•	AC1 : Users can generate expiring read-only links that open without auth.
	•	AC2: Exports match schema and pass validation on re-import.
	•	AC3 : Revoked links stop working within 60 seconds.

Title: Mobile Responsiveness (Read-Only MVP)
Why: Let users review results and alerts on the go.
Scope:
	•	Frontend: Responsive layouts for dashboard, results, notifications; touch targets.
	•	Backend: No changes (reuse APIs).
	•	Infra: Lighthouse mobile audits in CI.
Acceptance Criteria:
	•	AC1 : Core pages pass Lighthouse mobile performance ≥ 80 and a11y ≥ 90.
	•	AC2: Charts support pinch/zoom and responsive legends.
	•	AC3 : Notification actions (ack) work on mobile.

Title: Security Hardening
Why: Reduce attack surface and meet best practices.
Scope:
	•	Frontend: CSP headers via middleware, secure cookies, CSRF guards.
	•	Backend: Input sanitation, rate limiting, authz checks, secrets rotation.
	•	Infra: Dependabot, SAST, container scanning, backups/restore drill.
Acceptance Criteria:
	•	AC1 : OWASP ASVS checklist items for level 1 pass; pen-test smoke passes.
	•	AC2: Backups restore successfully into staging with RPO/RTO recorded.
	•	AC3 : CSP blocks inline scripts; no mixed content or XSS in scans.

Title: Analytics & Telemetry for Product Insights
Why: Measure activation, retention, and feature efficacy.
Scope:
	•	Frontend: Event map implementation, consent-aware tracking, UTM attribution.
	•	Backend: Event ingestion endpoint (if proxying), cohort queries.
	•	Infra: Dashboard for activation metrics and paper-trading adoption.
Acceptance Criteria:
	•	AC1 : Event coverage ≥ 90% for defined funnel; sampling configurable.
	•	AC2: Activation dashboard shows TTFB (time-to-first-backtest) median and p90.
	•	AC3 : Opt-out respected and audited.

Title: Documentation & In-App Help
Why: Reduce support load and increase self-serve success.
Scope:
	•	Frontend: Help panel with contextual docs, tooltips, keyboard shortcuts.
	•	Backend: Docs metadata API, search index.
	•	Infra: Docs build pipeline, versioning, link checker in CI.
Acceptance Criteria:
	•	AC1 : Contextual help available on canvas, results, scheduler screens.
	•	AC2: Full-text search returns relevant docs in <300ms.
	•	AC3 : Broken links job runs nightly and reports zero failures.

Title: Release Engineering & Playbooks
Why: Enable safe, frequent releases and rapid rollback.
Scope:
	•	Frontend: Feature flags for risky UI, environment banners.
	•	Backend: Blue/green deploy script, DB migration safety (online).
	•	Infra: CI/CD pipelines, seed data playbook, rollback runbooks, status page.
Acceptance Criteria:
	•	AC1 : One-click rollback restores previous version within 5 minutes.
	•	AC2: Migrations are reversible and pass pre-deploy checks.
	•	AC3 : Seed scripts run idempotently and emit verification metrics.

Title: Beta Launch & Feedback Loop
Why: Validate product-market fit and prioritize post-beta roadmap.
Scope:
	•	Frontend: Beta badge, feedback widget, NPS flow.
	•	Backend: Feedback API, labeler for themes, experiment toggles.
	•	Infra: Beta cohort gating, feedback dashboard, weekly review cadence.
Acceptance Criteria:
	•	AC1 : Beta users can submit in-app feedback; themes appear on dashboard.
	•	AC2: Weekly report exported with top issues and proposed fixes.
	•	AC3 : Post-beta backlog created with prioritized, spec-ready items.