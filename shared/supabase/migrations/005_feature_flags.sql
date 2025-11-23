-- Migration: 005 Feature Flags table
-- Provides a lightweight toggle store for onboarding and future experiments.

create table if not exists feature_flags (
    flag_key text not null,
    description text not null default '',
    enabled boolean not null default false,
    workspace_id uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint feature_flags_pk primary key (flag_key)
);

create index if not exists feature_flags_workspace_idx
    on feature_flags (workspace_id);

create or replace function feature_flags_set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists feature_flags_updated_at on feature_flags;

create trigger feature_flags_updated_at
    before update on feature_flags
    for each row execute function feature_flags_set_updated_at();
