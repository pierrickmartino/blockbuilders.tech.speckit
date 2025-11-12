# Feature Specification: Onboarding & First-Run Checklist

**Feature Branch**: `001-onboarding-checklist`  
**Created**: 2025-11-12  
**Status**: Draft  
**Input**: User description: "Title: 004-Onboarding & First-Run Checklist Why: Drive time-to-first-backtest under 15 minutes. Scope: - Frontend: Guided checklist, progress tracker, starter template selection, inline disclosures. - Backend: Track onboarding state, event telemetry endpoints. - Infra: Analytics events schema, dashboards for funnel. Acceptance Criteria: - AC1 : New user sees checklist with at least 4 steps and completion persists across sessions. - AC2: Selecting a starter template primes a draft strategy in the canvas. - AC3 : Funnel dashboard shows step completion rates by cohort."

## Clarifications

### Session 2025-11-12

- Q: Should checklist completion be tracked per user or shared at the workspace level? → A: Track checklist completion independently for each user, even when they share a workspace.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Finish the guided checklist (Priority: P1)

A first-time strategy builder signs in and is greeted by a four-step guided checklist that explains disclosures, connects data, imports a starter template, and runs the first backtest; progress persists even if they leave and return later the same day.

**Why this priority**: Time-to-first-backtest under 15 minutes is the stated business goal, and this journey ties the entire onboarding experience together.

**Independent Test**: Create a brand-new workspace, walk through the steps sequentially or out of order, and confirm that completion state and disclosures persist after refresh or re-login.

**Acceptance Scenarios**:

1. **Given** a net-new account on first sign-in, **When** the workspace loads, **Then** a checklist with at least four ordered steps is visible and focus is set on the first step.
2. **Given** a user who completes any checklist step, **When** they refresh or sign out and back in, **Then** the completed steps remain marked and the next incomplete step is highlighted.

---

### User Story 2 - Prime a draft strategy via starter templates (Priority: P2)

A new user who lacks historical strategies chooses one of the recommended starter templates from the checklist, sees the canvas pre-populated with template inputs, and can immediately run or edit the draft strategy.

**Why this priority**: Starter templates help non-experts reach a runnable strategy without writing everything from scratch, directly impacting time-to-value.

**Independent Test**: From the checklist, select each available template and confirm the canvas loads populated parameters, mock data, and a ready-to-run backtest without additional setup.

**Acceptance Scenarios**:

1. **Given** the checklist is open, **When** the user clicks “Use template” on any listed template, **Then** the strategy canvas opens with that template’s parameters already filled in and a draft title referencing the template.
2. **Given** a pre-populated draft from a template, **When** the user edits fields or runs a backtest, **Then** all template defaults remain editable and no validation errors stem from missing data.

---

### User Story 3 - Monitor funnel conversion (Priority: P3)

A growth or analytics stakeholder reviews a dashboard showing step completion, drop-off rates, and cohort comparisons (e.g., acquisition channel, signup month) to spot onboarding friction.

**Why this priority**: Without visibility into the checklist funnel, the team cannot iterate on content or sequencing to improve activation.

**Independent Test**: Ingest sample onboarding events, load the dashboard, and confirm each step displays counts, conversion percentages, and at least one cohort breakdown.

**Acceptance Scenarios**:

1. **Given** onboarding telemetry is flowing, **When** the dashboard loads, **Then** it shows per-step completion rates and average time between steps for a selectable date range.
2. **Given** a cohort filter (e.g., “Paid pilots”), **When** it is applied, **Then** the dashboard recalculates metrics and highlights statistically significant drop-offs (>10 percentage points) for that cohort.

---

### Edge Cases

- User dismisses the checklist before completing any step; system must allow re-opening and preserve prior progress.
- Connectivity loss or browser crash mid-step should not duplicate events or corrupt completion state when the user resumes.
- Template library may be temporarily empty for certain roles; checklist must gracefully hide the template step or offer an alternate path.
- Users who already completed onboarding in a previous environment should be able to skip remaining steps via a “Mark as done” control without skewing telemetry.
- Accessibility failures: checklist navigation must be keyboard operable, announce progress to screen readers, and keep focus within the modal when open.
- Performance: initial checklist render should not add more than one second to first meaningful paint; telemetry batching must avoid blocking UI interactions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Experience, Simplicity)**: Present a guided onboarding checklist with at least four ordered steps on every new user’s first visit until all steps are marked complete. **Verification**: UX review + automated UI test that inspects the DOM for four labeled steps on first load.
- **FR-002 (Quality, Testing)**: Persist per-step completion state server-side on a per-user basis so each teammate has independent progress that survives page reloads, browser changes, or device switches. **Verification**: Integration test simulating multi-session logins across two users in the same workspace plus database inspection confirming isolated step states per user.
- **FR-003 (Experience, Performance)**: Provide contextual inline disclosures (e.g., data-risk statements) adjacent to each relevant step, and require explicit acknowledgement before the step can be marked complete. **Verification**: UX acceptance test ensuring disclosures are visible and acknowledgement captured in telemetry payloads.
- **FR-004 (Experience, Simplicity)**: Offer at least three curated starter templates within the checklist, each with a short description, estimated time-to-run, and “Use template” action. **Verification**: Content audit confirming template metadata and CTA appear for each template.
- **FR-005 (Experience, Quality)**: When a template is selected, prime the strategy canvas with the template’s parameters, placeholder data, and naming convention so a backtest can run without additional required inputs. **Verification**: End-to-end test executing a backtest immediately after template selection and asserting success without validation prompts.
- **FR-006 (Testing, Observability)**: Record every checklist interaction (viewed, step_start, step_complete, template_selected, disclosure_ack) with timestamp, user identifier, cohort tags, and client context. **Verification**: Telemetry contract test ensuring events hit the analytics ingest endpoint with required fields.
- **FR-007 (Quality, Reliability)**: Maintain an onboarding state object server-side that enforces step ordering, prevents duplicate completion, and supports manual overrides by support staff with audit logs. **Verification**: API-level tests hitting state endpoints and verifying idempotent responses plus audit log entries.
- **FR-008 (Experience, Accessibility)**: Checklist UI must meet accessibility baselines: focus trapping when active, screen-reader-friendly labels for progress, and keyboard shortcuts for navigation. **Verification**: Accessibility audit (axe or similar) plus manual keyboard walkthrough.
- **FR-009 (Insights, Performance)**: Provide an analytics funnel dashboard summarizing completion counts, conversion %, median time per step, and drop-off reasons, filterable by acquisition cohort, date range, and plan type. **Verification**: Data visualization test with fixture data ensuring filters recalculate metrics.
- **FR-010 (Insights, Governance)**: Define and publish an analytics events schema (fields, enums, retention) so data engineering can build downstream pipelines, and ensure dashboards alert when events fall below expected volumes. **Verification**: Schema document review plus monitoring alert test where synthetic data pauses trigger notifications.

### Key Entities

- **OnboardingChecklist**: Represents the ordered list of steps displayed to a user, including step id, title, description, disclosure text, and minimum completion criteria.
- **ChecklistStepProgress**: Stores the user-specific status for each step (not started, in progress, completed), timestamps, acknowledgements, and actor (auto vs. manual override).
- **StarterTemplateSelection**: Captures which template a user chose, the version of the template, and the resulting strategy draft metadata passed to the canvas.
- **OnboardingEvent**: Telemetry payload emitted for each checklist interaction, containing event type, user id, session id, cohort attributes, client context, and optional error details.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-01**: 90% of net-new workspaces created in a calendar month see the onboarding checklist within 5 seconds of loading the application, confirmed via telemetry timestamps.
- **SC-02**: Median time from first checklist view to first successful backtest for guided users is ≤15 minutes during the first month post-launch.
- **SC-03**: At least 70% of users who select a starter template successfully run a backtest without encountering blocking validation errors within that same session.
- **SC-04**: Funnel dashboard adoption: product or growth stakeholders view the dashboard at least twice per week and can export completion rates segmented by at least two cohorts without analyst assistance.
- **SC-05**: Data quality guardrails trigger alerts if event volume for any step drops by >20% day-over-day, and such alerts must occur less than once per quarter due to instrumentation faults.

## Assumptions

- Onboarding applies to new workspaces or users who have not yet run a backtest; returning power users can optionally dismiss the checklist permanently via support.
- Cohort definitions (plan type, acquisition channel, signup month) already exist in the customer data platform and can be reused for the funnel dashboard.
- Starter templates leverage existing sample data assets that are safe to expose to all new users, removing the need for per-tenant provisioning during onboarding.

## Dependencies & Risks

- Requires analytics engineering bandwidth to model the new events and power the dashboard before launch.
- Legal/compliance review needed for the inline disclosures text to ensure claims match regulatory requirements for algorithmic trading tools.
- Success depends on reliable template metadata governance; outdated templates could mislead users or extend time-to-first-backtest.
