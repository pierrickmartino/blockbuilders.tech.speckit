# Data Model – Onboarding & First-Run Checklist

## Entities & Fields

### OnboardingChecklist
- `checklist_id` (UUID) – immutable identifier for the checklist definition.
- `version` (integer) – increments when steps/order/content change; default `1` for this launch.
- `workspace_id` (UUID) – optional scope knob; `NULL` indicates global default config.
- `title` (string, 1-80 chars) – surfaced in UI header.
- `steps` (array<ChecklistStepDefinition>) – ordered list of 4+ steps.

**ChecklistStepDefinition** (embedded JSONB)
- `step_id` (string, slug, kebab-case, unique within checklist).
- `sequence` (int) – must be contiguous starting at 1.
- `title` (string, 1-60 chars).
- `description` (markdown string ≤500 chars) – supports inline disclosures links.
- `disclosure` (rich text blob with acknowledgement requirement flag).
- `cta` (enum: `connect_data`, `select_template`, `run_backtest`, `acknowledge`) – aligns to FR-001..FR-005 actions.
- `template_ids` (array<UUID>) – optional, only for template step.
- `requires_ack` (boolean) – ties to FR-003.
- `completion_rules` (JSON Schema fragment) – e.g., `{"event":"template_primed"}` to validate telemetry.

### ChecklistStepProgress
- `progress_id` (UUID).
- `user_id` (UUID) – Supabase auth user.
- `workspace_id` (UUID).
- `checklist_id` (UUID) – FK to `OnboardingChecklist`.
- `step_id` (string) – FK to step definition.
- `status` (enum: `not_started`, `in_progress`, `completed`, `skipped_manual`).
- `acknowledged_at` (timestamp) – populated when disclosures accepted.
- `completed_at` (timestamp).
- `actor` (enum: `user`, `system`, `support_override`).
- `metadata` (JSONB) – stores template selection info, errors, device context.
- `version` (integer) – matches checklist version for migrations.
- Unique constraint on (`user_id`, `workspace_id`, `checklist_id`, `step_id`).

### StarterTemplate
- `template_id` (UUID).
- `title` (string, ≤60 chars) – surfaced in UI.
- `description` (string, ≤240 chars).
- `estimated_time` (enum: `under_2m`, `under_5m`, `under_10m`).
- `category` (enum: `momentum`, `mean_reversion`, `pairs`, etc.).
- `version` (semver string) – to audit future updates.
- `inputs` (JSONB) – canonical parameters for React Flow priming (nodes, edges, metadata for canvas overlay).
- `sample_data_ref` (string) – references shared dataset.
- `status` (enum: `active`, `deprecated`).

### StarterTemplateSelection
- `selection_id` (UUID).
- `user_id`, `workspace_id` (UUIDs).
- `template_id` (UUID) – FK to `StarterTemplate`.
- `checklist_id` + `step_id` – optional back-reference.
- `primed_canvas_id` (UUID) – reference to React Flow instance/draft strategy.
- `primed_at` (timestamp).
- `success` (boolean) – indicates whether the template produced a runnable draft immediately.
- `error_reason` (string enum) – populated when `success=false`.

### OnboardingEvent
- `event_id` (UUID).
- `event_type` (enum: `checklist_viewed`, `step_start`, `step_complete`, `template_selected`, `disclosure_ack`, `backtest_run`, `override_applied`).
- `user_id`, `workspace_id`, `session_id`.
- `step_id` (nullable) – ties to step-specific events.
- `template_id` (nullable).
- `cohort` (JSONB) – acquisition channel, signup month, plan type, experiment buckets.
- `client_context` (JSONB) – browser, device, region.
- `latency_ms` (int) – time between previous and current step.
- `created_at` (timestamp, default now()).
- `ingested_at` (timestamp) – when forwarded to Datadog.

### FunnelMetricSnapshot (derived view powering dashboard)
- `date_bucket` (date) – per-day aggregate.
- `cohort_key` (string) – e.g., `channel:paid`.
- `step_id`.
- `view_count`, `start_count`, `complete_count` (ints).
- `conversion_rate` (numeric, computed).
- `median_time_sec` (numeric) – median completion latency between steps.
- `drop_off_pct` (numeric) – highlight >10 percentage point drop.

## Relationships
- `OnboardingChecklist.steps` ↔ `ChecklistStepProgress.step_id` (1:M) – user progress references checklist definition by version; migrations clone definitions for new versions.
- `ChecklistStepProgress.metadata.template_id` ↔ `StarterTemplate.template_id` when the template step completes.
- `StarterTemplateSelection` has FK to both `StarterTemplate` and `ChecklistStepProgress` (optional) so analytics can tie template priming to checklist completion.
- `OnboardingEvent` references either `ChecklistStepProgress` or `StarterTemplateSelection` depending on event type; events stream into `FunnelMetricSnapshot` materialized view for dashboards.

## Validation & Business Rules
- Each checklist must have ≥4 steps; sequences must be contiguous; only one template-selection step is allowed per checklist instance.
- `ChecklistStepProgress.status` transitions must respect ordering: a step cannot be `completed` until all prior steps are `completed` or `skipped_manual`.
- Disclosure-required steps enforce `requires_ack=true` and demand `acknowledged_at` before `status` becomes `completed`.
- Overrides with `actor=support_override` require audit metadata (support agent id and reason) stored in `metadata`.
- Template selection auto-creates `StarterTemplateSelection` and attaches `primed_canvas_id`; failure to prime keeps the checklist step `in_progress` and records `error_reason`.
- Onboarding events must include `session_id` and `cohort` tags to support SC-04 filters; ingestion rejects payloads missing these fields.

## State Transitions
- `ChecklistStepProgress` follows: `not_started` → (`in_progress`|`skipped_manual`) → `completed`; manual skip writes `skipped_manual` and still logs an event so analytics can detect bypasses.
- Template step emits `template_selected` (click), waits for React Flow priming event, then logs `step_complete` once canvas ack is received.
- `OnboardingEvent` pipeline: client/frontend emits event → Supabase table insert → trigger enqueues Datadog forwarder → Datadog metrics update dashboards/alerts.
- Funnel dashboard filters recompute by pulling from `FunnelMetricSnapshot` aggregated each hour via Supabase cron job.
