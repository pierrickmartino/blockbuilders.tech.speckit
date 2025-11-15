-- Migration: 004 Onboarding Checklist schema
-- Applies onboarding tables + indexes referenced throughout Phase 2.

create extension if not exists "pgcrypto";

create table if not exists onboarding_checklists (
    checklist_id uuid not null,
    version integer not null,
    title text not null,
    steps jsonb not null,
    published_at timestamptz not null default now(),
    is_active boolean not null default false,
    disclosure_locale text not null default 'en-US',
    definition_hash text not null default '',
    definition_notes text,
    constraint onboarding_checklists_pk primary key (checklist_id, version)
);

create unique index if not exists onboarding_checklists_active_idx
    on onboarding_checklists (is_active)
    where is_active;

create table if not exists checklist_step_progress (
    progress_id uuid primary key default gen_random_uuid(),
    checklist_id uuid not null,
    version integer not null,
    user_id uuid not null,
    workspace_id uuid not null,
    step_id text not null,
    status text not null check (status in ('NOT_STARTED','IN_PROGRESS','COMPLETED')),
    ack_token jsonb,
    template_diff jsonb,
    completed_at timestamptz,
    completed_by uuid,
    override_reason text,
    override_actor_role text,
    override_pending boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint checklist_progress_unique unique (user_id, workspace_id, version, step_id),
    constraint checklist_progress_checklist_fk foreign key (checklist_id, version)
        references onboarding_checklists (checklist_id, version)
        on delete cascade
);

create index if not exists checklist_progress_workspace_idx
    on checklist_step_progress (workspace_id, user_id);

create table if not exists starter_templates (
    template_id uuid primary key,
    title text not null,
    description text not null,
    estimated_run_time interval not null,
    default_parameters jsonb not null,
    react_flow_schema jsonb not null,
    version integer not null default 1,
    status text not null default 'ACTIVE' check (status in ('ACTIVE','DEPRECATED')),
    updated_at timestamptz not null default now()
);

create index if not exists starter_templates_status_idx
    on starter_templates (status);

create table if not exists starter_template_selections (
    selection_id uuid primary key default gen_random_uuid(),
    template_id uuid not null references starter_templates(template_id),
    progress_id uuid not null references checklist_step_progress(progress_id) on delete cascade,
    checklist_id uuid not null,
    version integer not null,
    user_id uuid not null,
    workspace_id uuid not null,
    draft_strategy_id uuid not null,
    parameter_changes jsonb not null,
    react_flow_snapshot jsonb not null,
    saved_at timestamptz not null default now()
);

create index if not exists template_selection_workspace_idx
    on starter_template_selections (workspace_id, user_id);

create unique index if not exists template_selection_progress_idx
    on starter_template_selections (progress_id);

create table if not exists onboarding_events (
    event_id uuid primary key default gen_random_uuid(),
    occurred_at timestamptz not null default now(),
    event_type text not null check (
        event_type in (
            'viewed','step_start','step_complete','template_selected',
            'disclosure_ack','override','override_pending_cleared','backtest_success'
        )
    ),
    user_id uuid not null,
    workspace_id uuid not null,
    checklist_id uuid,
    version integer,
    step_id text,
    template_id uuid,
    metadata jsonb,
    forwarded_to_datadog boolean not null default false,
    forwarder_attempts integer not null default 0,
    last_forwarded_at timestamptz
);

create index if not exists onboarding_events_forwarded_idx
    on onboarding_events (forwarded_to_datadog, forwarder_attempts);

create index if not exists onboarding_events_workspace_idx
    on onboarding_events (workspace_id, user_id);

create table if not exists onboarding_disclosures (
    locale text primary key,
    disclosure_copy text not null,
    reviewer text not null,
    reviewed_at date not null,
    evidence_link text
);

create table if not exists onboarding_reset_events (
    event_id uuid primary key default gen_random_uuid(),
    checklist_id uuid not null,
    version integer not null,
    definition_hash text not null,
    broadcast_topic text not null,
    created_at timestamptz not null default now()
);

create index if not exists onboarding_reset_topic_idx
    on onboarding_reset_events (broadcast_topic, created_at desc);
