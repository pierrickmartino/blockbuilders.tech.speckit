# Data Model — 004 Onboarding & First-Run Checklist

## OnboardingChecklist
- **Fields**: `checklist_id (uuid)`, `version (int, monotonic)`, `title`, `steps[] (ordered array of ChecklistStepDefinition)`, `published_at`, `is_active`.
- **Relationships**: One checklist version to many `ChecklistStepProgress` rows via `checklist_id` + `version`.
- **Validation Rules**:
  - `version` increments on any content change and triggers global progress reset.
  - Minimum of four steps, each with `disclosure_required` flag + localized copy id.
  - Only one active version at a time.
- **State Transitions**: Draft → Approved → Active. Activation auto-resets progress (`ChecklistStepProgress.status = NOT_STARTED`).

## ChecklistStepDefinition (embedded)
- **Fields**: `step_id (string)`, `sequence (int)`, `title`, `body`, `requires_disclosure (bool)`, `requires_template_edit (bool)`, `cta_label`, `template_id (nullable)`.
- **Validation Rules**: `sequence` strictly increasing; `requires_template_edit` only valid when `template_id` present.

## ChecklistStepProgress
- **Fields**: `progress_id (uuid)`, `user_id`, `workspace_id`, `checklist_id`, `version`, `step_id`, `status (NOT_STARTED|IN_PROGRESS|COMPLETED)`, `ack_token (jsonb)`, `template_diff (jsonb)`, `completed_at`, `completed_by (user_id or support_actor)`, `override_reason`.
- **Relationships**: Belongs to `OnboardingChecklist`; `user_id` FK to Supabase auth users.
- **Validation Rules**:
  - Unique constraint on (`user_id`, `workspace_id`, `version`, `step_id`).
  - Cannot move to COMPLETED unless disclosures acknowledged when `requires_disclosure = true`.
  - Template step completion requires `template_diff` capturing at least one modified parameter + saved draft id.
- **State Transitions**: NOT_STARTED → IN_PROGRESS → COMPLETED; support override can set COMPLETED from any state but must log actor + reason.

## StarterTemplate
- **Fields**: `template_id (uuid)`, `title`, `description`, `estimated_run_time`, `default_parameters (jsonb)`, `react_flow_schema (jsonb)`, `version`, `status (ACTIVE|DEPRECATED)`.
- **Relationships**: Referenced by `ChecklistStepDefinition.template_id` and `StarterTemplateSelection.template_id`.
- **Validation Rules**: At least three ACTIVE templates at launch; deprecated templates cannot be attached to active checklist versions; `react_flow_schema` must include valid React Flow nodes/edges per canvas contract.

## StarterTemplateSelection
- **Fields**: `selection_id (uuid)`, `user_id`, `workspace_id`, `template_id`, `draft_strategy_id`, `parameter_changes (jsonb)`, `react_flow_snapshot (jsonb)`, `saved_at`.
- **Relationships**: Linked to `ChecklistStepProgress` for template step; `draft_strategy_id` references canvas drafts in existing strategy service.
- **Validation Rules**: `parameter_changes` must include ≥1 key/value difference from `StarterTemplate.default_parameters` before marking checklist step complete; `react_flow_snapshot` stores the exact serialized node/edge set used to prime the canvas so React Flow can hydrate deterministically.

## OnboardingEvent
- **Fields**: `event_id (uuid)`, `occurred_at`, `event_type (viewed|step_start|step_complete|template_selected|disclosure_ack|override)`, `user_id`, `workspace_id`, `step_id`, `template_id`, `metadata (jsonb)`, `forwarded_to_datadog (bool)`.
- **Relationships**: Each event originates from checklist interactions and is forwarded to Datadog via the Supabase event forwarder.
- **Validation Rules**: `forwarded_to_datadog` toggles true only after successful delivery receipt; retries capped at 5 with exponential backoff.
- **State Transitions**: Pending → Forwarded → Archived (after analytics retention period).
