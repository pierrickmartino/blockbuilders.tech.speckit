<!--
Sync Impact Report
Version change: 0.0.0 → 1.0.0 (initial publication)
Modified principles:
- New → I. Code Quality Without Compromise
- New → II. Simplicity Over Speculation
- New → III. Test Evidence First
- New → IV. Consistent Experience Every Time
- New → V. Performance and Reliability Budgets
Added sections:
- Technology Standards
- Delivery Workflow
Removed sections:
- None
Templates requiring updates:
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/tasks-template.md
Follow-up TODOs:
- None
-->

# Blockbuilders Speckit Constitution

## Core Principles

### I. Code Quality Without Compromise

- All code MUST pass automated linting, type-checking, and security scanners before review: `pnpm lint --max-warnings 0`, `pnpm type-check`, `pnpm test:coverage`, `ruff check`, and `uv run pytest` are the required baselines.
- Vertical-slice architecture, file size limits, and reusable patterns documented in `claude-nextjs-15.md` and `claude-python.md` MUST be followed; deviations require a written exception with compensating controls.
- Every pull request MUST document the quality gates exercised and receive peer review that confirms adherence to this constitution before merge.

Rationale: Enforcing the full quality toolchain and shared architecture prevents regressions, codifies maintainability, and protects the user experience as the system grows.

### II. Simplicity Over Speculation

- Features MUST trace to approved requirements in `/specs/<feature-id>/spec.md`; work without traceability is removed before implementation starts.
- Solutions MUST prefer composition over inheritance, reuse existing utilities, and avoid introducing new dependencies unless a plan documents why existing components are insufficient.
- Designs MUST expose only the APIs, components, and configuration needed for the current iteration; speculative hooks are prohibited until a documented user story demands them.

Rationale: KISS and YAGNI discipline keeps the product understandable, keeps costs predictable, and ensures every abstraction pays for itself immediately.

### III. Test Evidence First

- Tests MUST be authored before implementation, fail initially, and cover new and changed behavior with a sustained ≥80% statement and branch coverage across web and service code.
- Automated accessibility, API contract, and regression tests MUST be included whenever their corresponding surfaces change; missing coverage blocks merge until added.
- Continuous integration MUST remain green; any failing pipeline freezes deployment until remediated with root-cause notes linked in the plan or spec.

Rationale: Treating tests as the contract gives verifiable evidence of correctness, accelerates refactors, and preserves user trust.

### IV. Consistent Experience Every Time

- UI changes MUST use the shared Tailwind tokens, design primitives, and Next.js 15 server/client boundaries defined in `claude-nextjs-15.md`; ad-hoc styling is prohibited.
- All user-visible flows MUST satisfy WCAG 2.2 AA requirements, provide keyboard navigation, maintain focus order, and include accessible alternatives for charts and media.
- Specifications MUST document acceptance checks for UX, and delivery MUST demonstrate those checks (automated or manual) prior to handoff.

Rationale: Consistent, accessible experiences reduce cognitive load, broaden usability, and keep the product aligned with brand expectations.

### V. Performance and Reliability Budgets

- Web surfaces MUST meet ≤2s Time-to-Interactive and ≤2.5s Largest Contentful Paint on reference devices; backend APIs MUST sustain ≤200ms p95 latency for prioritized routes.
- Background workloads (backtests, data ingestion, job runners) MUST expose metrics, alerts, and dashboards; SLO breaches trigger a remediation task in the next iteration.
- Each change MUST include a performance validation step—load test, profiling, or telemetry update—that proves the relevant budget remains within thresholds.

Rationale: Guarding performance and reliability budgets keeps the platform responsive, predictable, and cost-efficient.

## Technology Standards

- Next.js 15 with React 19 (App Router, Server Components, Turbopack) is the canonical web stack; `pnpm` manages JavaScript dependencies, and shared components live in feature-aligned vertical slices.
- Tailwind CSS tokens, generated design primitives, and shadcn-based UI components provide the only approved styling system; custom CSS requires a documented exception.
- Python 3.12+ with FastAPI, `uv` for dependency management, and strict Ruff/pytest enforcement is the standard for backend services and automation.
- Observability MUST use the shared Datadog dashboards defined in iteration plans; metrics, traces, and logs are mandatory for every service and background worker.
- Security artifacts (secrets, compliance runbooks, disclosures) MUST live in version-controlled locations referenced by the relevant iteration documents.

## Delivery Workflow

- Every initiative starts with a feature specification in `/specs/<feature-id>/spec.md`, capturing user journeys, acceptance criteria, and UX/performance budgets aligned to these principles.
- The implementation plan produced via `/speckit.plan` MUST complete the Constitution Check by documenting controls for quality, simplicity, testing, experience, and performance before Phase 0 proceeds.
- Tasks generated by `/speckit.tasks` MUST group work by user story, include pre-implementation testing tasks, and explicitly call out performance and accessibility validation steps.
- Code reviews MUST verify that artefacts (spec, plan, tasks, telemetry) stay synchronized; deviations trigger immediate updates or create a tracked follow-up task.
- Release notes MUST reference the principle compliance evidence (tests run, budgets validated, UX checks) for each shipped story.

## Governance

- This constitution supersedes conflicting guidance; `claude-nextjs-15.md`, `claude-python.md`, and iteration documents interpret these principles for stack-specific execution.
- Amendments require: (1) a written proposal referencing affected principles, (2) updates to dependent templates and guidance, (3) team approval recorded in the repository, and (4) a new Sync Impact Report summarizing changes.
- Versioning follows semantic rules: MAJOR for breaking principle changes or removals, MINOR for new principles or material expansions, PATCH for clarifications; every amendment updates the version line and Last Amended date.
- Compliance reviews occur at the close of each iteration; any violation produces corrective tasks and, if systemic, triggers a governance retrospective.
- The constitution, templates, and referenced guidance undergo a quarterly audit to ensure tooling, frameworks, and metrics remain current with platform upgrades.

**Version**: 1.0.0 | **Ratified**: 2025-10-29 | **Last Amended**: 2025-10-29
