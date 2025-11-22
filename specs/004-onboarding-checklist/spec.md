# Feature Specification: Onboarding & First-Run Checklist

**Feature Branch**: `004-onboarding-checklist`  
**Created**: 2025-11-12  
**Status**: Draft  
**Input**: User description: "Title: 004-Onboarding & First-Run Checklist Why: Drive time-to-first-backtest under 15 minutes. Scope: - Frontend: Guided checklist, progress tracker, starter template selection, inline disclosures. - Backend: Track onboarding state via dedicated onboarding APIs. Acceptance Criteria: - AC1 : New user sees checklist with at least 4 steps and completion persists across sessions. - AC2: Selecting a starter template primes a draft strategy in the canvas."

## Overview

New strategy builders often abandon onboarding before running a first backtest because they do not know which steps matter, lose disclosures, or lack a runnable starting point. This feature adds a guided four-step checklist that greets every first-run teammate, persists per-user progress in Supabase, enforces disclosure acknowledgements, and primes the canvas with curated templates so most users reach a successful backtest in ≤15 minutes while staying compliant with regional disclosure rules.

## Context

- **Primary users**: First-time teammates inside a workspace who have never run a backtest.
- **Business goal**: Increase activation by shortening time-to-first-backtest and ensuring onboarding telemetry hits SC-01/02/03 targets.
- **Out of scope**: Editing the core backtest engine, adding new template authoring tools, or redefining workspace roles.

## Clarifications

### Session 2025-11-12

- Q: Should checklist completion be tracked per user or shared at the workspace level? → A: Track checklist completion independently for each user, even when they share a workspace.
- Q: How should onboarding interaction events be persisted and routed for analytics? → A: Store events in Supabase onboarding tables and forward them through the existing Supabase→Datadog event forwarder.
- Q: When the checklist definition changes, should prior user progress be preserved? → A: Reset all completion states so every user restarts from step one after a checklist change.
- Q: What is the completion criteria for the template-selection step? → A: User must customize at least one parameter and save the draft before the step counts as complete.
- Q: Who is authorized to trigger the “Mark as done” override? → A: Any signed-in teammate in the workspace may trigger it after confirming via the inline modal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Finish the guided checklist (Priority: P1)

A first-time strategy builder signs in and is greeted by a four-step guided checklist that explains disclosures, connects data, imports a starter template, and runs the first backtest; progress persists even if they leave and return later the same day.

**Why this priority**: Time-to-first-backtest under 15 minutes is the stated business goal, and this journey ties the entire onboarding experience together.

**Independent Test**: Create a brand-new workspace, walk through the steps sequentially or out of order, and confirm that completion state and disclosures persist after refresh or re-login.

**Acceptance Scenarios**:

1. **Given** a net-new account on first sign-in, **When** the workspace loads, **Then** a checklist with at least four ordered steps is visible and focus is set on the first step.
2. **Given** a user who completes any checklist step, **When** they refresh or sign out and back in, **Then** the completed steps remain marked and the next incomplete step is highlighted.
3. **Given** a user dismisses the checklist before finishing, **When** they click “Resume onboarding,” **Then** the modal re-opens on the next incomplete step with all prior completions preserved.

---

### User Story 2 - Prime a draft strategy via starter templates (Priority: P2)

A new user who lacks historical strategies chooses one of the recommended starter templates from the checklist, sees the canvas pre-populated with template inputs, and can immediately run or edit the draft strategy.

**Why this priority**: Starter templates help non-experts reach a runnable strategy without writing everything from scratch, directly impacting time-to-value.

**Independent Test**: From the checklist, select each available template and confirm the canvas loads populated parameters, mock data, and a ready-to-run backtest without additional setup.

**Acceptance Scenarios**:

1. **Given** the checklist is open, **When** the user clicks “Use template” on any listed template, **Then** the strategy canvas opens with that template’s parameters already filled in and a draft title referencing the template.
2. **Given** a pre-populated draft from a template, **When** the user edits fields or runs a backtest, **Then** all template defaults remain editable and no validation errors stem from missing data.

---

### User Story 3 - Trust onboarding telemetry (Priority: P2)

A product analyst monitors the onboarding funnel and needs render latency, interaction events, and SC-01/02/03 rollups directly in Datadog so regressions are caught without manual SQL pulls.

**Why this priority**: FR-006 and FR-010 underpin activation KPIs; without dedicated validation the telemetry pipeline could drift unnoticed and violate Constitution Principle V.

**Independent Test**: Run the CI telemetry script to generate synthetic SC metrics, confirm failures block the pipeline when thresholds are exceeded, and verify Datadog dashboards exclude override-pending sessions until `backtest_success` events arrive.

**Acceptance Scenarios**:

1. **Given** CI runs `/scripts/ci/verify-sc-metrics.sh`, **When** SC metrics exceed thresholds, **Then** the job fails, attaches evidence to `/docs/qa/onboarding-checklist.md`, and invokes `/scripts/ci/report-sc-regression.ts` to record and link the regression to a remediation task in `specs/004-onboarding-checklist/tasks.md`.
2. **Given** onboarding telemetry flows into Datadog, **When** an override remains in `override_pending`, **Then** SC-01/02/03 dashboards exclude that session until a `backtest_success` clears the flag.
3. **Given** the Supabase→Datadog forwarder exceeds 60 seconds latency, **When** the monitor fires, **Then** alerts include template/backtest-success rates so engineers can restore compliance with Principle V.

---

### User Story 4 - Legal-safe disclosures (Priority: P2)

A compliance reviewer must ensure that every locale ships only after legal approval is captured, enforced in seeds/CI, and surfaced in the UI when copy is pending.

**Why this priority**: FR-011 and the Compliance NFR require traceable legal sign-off; missing approvals could block release late or cause policy violations.

**Independent Test**: Attempt to seed an unapproved locale, verify the seed task fails with a link to `/docs/qa/onboarding-checklist.md`, and confirm the checklist UI refuses to render unapproved locales, showing a localized “copy pending approval” message.

**Acceptance Scenarios**:

1. **Given** a locale lacks approval metadata, **When** `seed-onboarding.ts` runs, **Then** it aborts with guidance pointing to `/docs/qa/onboarding-checklist.md` until the reviewer/date entry exists.
2. **Given** the checklist loads for a locale missing approval, **When** the disclosure-gated step renders, **Then** the step shows “copy pending approval” and blocks completion until approval is recorded.
3. **Given** CI executes release verification, **When** Supabase locales diverge from the approval table, **Then** the pipeline fails and links to FR-011 for remediation before deployment.

---

### Edge Cases

- User dismisses the checklist before completing any step; system must allow re-opening and preserve prior progress.
- Connectivity loss or browser crash mid-step should not duplicate events or corrupt completion state when the user resumes.
- Template library may be temporarily empty for certain roles; when zero templates are returned the checklist must follow the FR-004 fallback behavior ("Explore strategies" CTA linking to `/docs/templates/strategy-library.md`, disabled completion, explanatory copy).
- Users who already completed onboarding in a previous environment should be able to skip remaining steps via a “Mark as done” control without skewing completion metrics.
- Accessibility failures: checklist navigation must be keyboard operable, announce progress to screen readers, and keep focus within the modal when open.
- Performance: initial checklist render should not add more than one second to first meaningful paint; batched persistence must avoid blocking UI interactions.
- Dismissed checklist must surface a persistent “Resume onboarding” button pinned to the dashboard masthead (right side next to notifications); reopening via that control restores the next incomplete step without replaying completed steps even after a full reload.
- Any signed-in teammate may trigger the “Mark as done” override (after dual confirmation); overrides require a two-step confirmation (initial modal + explicit “Confirm override” review), emit `override_reason`, set an `override_pending` flag, and must not increment activation metrics unless the user subsequently runs a backtest that clears the pending state.
- Disclosure-gated steps must fail with a clear error if completion is attempted without an acknowledgement token; retried submissions must stay idempotent and never double-count acknowledgements.
- Checklist definition updates must broadcast the reset and restart every user from the first step while preventing data races between the old and new step definitions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Experience, Simplicity)**: Present a guided onboarding checklist with at least four ordered steps on every new user’s first visit until all steps are marked complete. **Verification**: UX review + automated UI test that inspects the DOM for four labeled steps on first load.
- **FR-002 (Quality, Testing)**: Persist per-step completion state server-side on a per-user basis so each teammate has independent progress that survives page reloads, browser changes, or device switches. **Verification**: Integration test simulating multi-session logins across two users in the same workspace plus database inspection confirming isolated step states per user.
- **FR-003 (Experience, Compliance)**: Checklist UI and APIs must enforce contextual inline disclosures: render locale-specific, legally approved copy adjacent to each gated step, block completion until `disclosure_ack` is provided, and return HTTP 409 when acknowledgements are missing or stale. **Verification**: UX review confirming inline copy and blocking CTA, backend contract tests covering the 409 response, and state-machine unit tests ensuring the UI mirrors backend disclosure locks.
- **FR-004 (Experience, Simplicity)**: When templates are available for the user’s role, offer at least three curated options within the checklist, each with a short description, estimated time-to-run, and “Use template” action; if the backend reports zero templates, surface the documented fallback CTA linking to `/docs/templates/strategy-library.md` and keep the checklist step incomplete until templates return. Require the user to modify at least one parameter and save the draft before the step can be marked complete. **Verification**: Content audit confirming template metadata and CTA appear for each template, UI test ensuring the fallback CTA points to `/docs/templates/strategy-library.md` when `templates_available` is false, and automation asserting a template step remains incomplete until a user edit + draft save occurs.
- **FR-005 (Experience, Quality)**: When a template is selected, prime the strategy canvas with the template’s parameters, placeholder data, and naming convention so a backtest can run without additional required inputs. **Verification**: End-to-end test executing a backtest immediately after template selection and asserting success without validation prompts.
- **FR-006 (Testing, Observability)**: Record every checklist interaction (viewed, step_start, step_complete, template_selected, disclosure_ack, override, override_pending_cleared, backtest_success) with timestamp, user identifier, cohort tags, template metadata, and client context, persisting to Supabase onboarding event tables and relaying via the existing Supabase→Datadog forwarder for dashboards. **Verification**: Contract test ensuring events hit the onboarding ingest endpoint with required fields and appear in Datadog via the forwarder, plus dashboard screenshots showing SC-01/02/03 calculations using this telemetry.
- **FR-007 (Quality, Reliability)**: Maintain an onboarding state object server-side that enforces step ordering, prevents duplicate completion, and supports manual overrides by any signed-in teammate after the dual-confirmation flow, with audit logs for every action; when the checklist definition changes, automatically reset all users’ completion states to align with the new step sequence. **Verification**: API-level tests hitting state endpoints, verifying idempotent responses plus audit log entries, Playwright scenario T047 covering dual-confirmation enforcement for regular teammates, and simulations of a checklist version change that clears prior completion.
- **FR-008 (Experience, Accessibility)**: Checklist UI must meet accessibility baselines: focus trapping when active, screen-reader-friendly labels for progress, and keyboard shortcuts for navigation. **Verification**: Accessibility audit (axe or similar) plus manual keyboard walkthrough.
- **FR-009 (Governance, Experience)**: Provide both self-service re-entry (Resume button) and “Mark as done” controls accessible to any signed-in teammate; overrides must capture actor + reason, require a dual-confirmation flow with explicit acknowledgement of metric impact, set an `override_pending` state, and remain reversible until a successful backtest clears the pending flag. **Verification**: Backend audit log inspection plus Playwright scenario covering the dual-confirmation flow, pending state, and auto-clearing after the next backtest.
- **FR-010 (Observability, Performance)**: Instrument the onboarding funnel so SC-01/02/03 metrics (checklist within 1 s, ≤15 min to first backtest, ≥70% template success) are computed via Supabase views and surfaced in Datadog dashboards; capture checklist render duration (≤1 s) via automated profiling. **Verification**: Telemetry dashboard snapshot plus CI evidence from Web Vitals/React Profiler showing thresholds are met pre-release.
- **FR-011 (Governance, Operations)**: Maintain a jurisdiction-aware disclosure registry and release gate: legal reviewers log approvals (locale, checklist version, reviewer, date) in `/docs/qa/onboarding-checklist.md`, Supabase seeds refuse to publish locales lacking approval metadata, and CI blocks deployment when active locales are missing sign-off. **Verification**: Seed scripts enforce approval presence, CI jobs compare Supabase locales to the approval registry, and documentation snapshots show the approval table before release.

### Non-Functional Requirements

- **Accessibility**: Modal, stepper, and resume entry point must meet WCAG 2.2 AA (focus trap, SR announcements, keyboard-only completable) with evidence from axe + manual runbooks.
- **Performance**: Checklist render adds ≤1 s to first meaningful paint; onboarding APIs stay ≤200 ms p95 under projected load; telemetry fan-out to Datadog occurs within 60 s; SC-01/02/03 must be calculated automatically in CI dashboards; async checklist persistence (step submit/resume) keeps interaction latency ≤150 ms under load, verified via automated browser tests.
- **Reliability**: Version resets are atomic, idempotent, and broadcast to clients without race conditions; telemetry events are deduplicated by `(user_id, step_id, checklist_version)`.
- **Compliance**: Legal approval is required before publishing or modifying disclosure copy or template guidance; approvals live in version-controlled QA docs referenced by the release checklist.
- **Security**: Server actions and FastAPI routes must enforce Supabase auth helpers, avoid leaking secrets to the client, and log overrides with actor identity for audit trails.

### Key Entities

- **OnboardingChecklist**: Represents the ordered list of steps displayed to a user, including step id, title, description, disclosure text, and minimum completion criteria.
- **ChecklistStepProgress**: Stores the user-specific status for each step (not started, in progress, completed), timestamps, acknowledgements, and actor (auto vs. manual override).
- **StarterTemplate**: Authoritative definition for each curated template, including id, version hash, description, estimated time-to-run, `requires_template_edit` flag, and the serialized React Flow schema used to prime the canvas.
- **StarterTemplateSelection**: Captures which template a user chose, the version of the template, and the resulting strategy draft metadata passed to the canvas.
- **OnboardingEvent**: Interaction payload emitted for each checklist action, containing event type, user id, session id, cohort attributes, client context, and optional error details.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-01**: 90% of net-new workspaces created in a calendar month see the onboarding checklist within 1 second of loading the application, confirmed via server-side timestamps + React Profiler traces.
- **SC-02**: Median time from first checklist view to first successful backtest for guided users is ≤15 minutes during the first month post-launch.
- **SC-03**: At least 70% of users who select a starter template successfully run a backtest without encountering blocking validation errors within that same session.

## Assumptions

- Onboarding applies to new workspaces or users who have not yet run a backtest; returning power users can optionally dismiss the checklist permanently via support.
- Starter templates leverage existing sample data assets that are safe to expose to all new users, removing the need for per-tenant provisioning during onboarding.

## Dependencies & Risks

- Legal/compliance review needed for the inline disclosures text to ensure claims match regulatory requirements for algorithmic trading tools.
- Success depends on reliable template metadata governance; outdated templates could mislead users or extend time-to-first-backtest.
