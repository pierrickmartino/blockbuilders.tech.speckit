-- Migration: OHLCV ingestion schema (v1)
-- Creates core tables for assets, OHLCV candles, ingestion runs, lineage, remediation, alerts, and vendor status.

create extension if not exists pgcrypto;

-- Enumerations
do $$
begin
    if not exists (select 1 from pg_type where typname = 'ohlcv_interval') then
        create type ohlcv_interval as enum ('minute', 'day');
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'ingestion_status') then
        create type ingestion_status as enum ('success', 'failed', 'partial', 'running');
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'ingestion_trigger') then
        create type ingestion_trigger as enum ('manual', 'scheduled');
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'issue_type') then
        create type issue_type as enum ('gap', 'duplicate', 'checksum_mismatch', 'partial_source');
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'alert_state') then
        create type alert_state as enum ('open', 'cleared');
    end if;
end $$;

do $$
begin
    if not exists (select 1 from pg_type where typname = 'vendor_state') then
        create type vendor_state as enum ('up', 'degraded', 'down', 'rate_limited');
    end if;
end $$;

-- Assets catalog (fixed 10 symbols in v1)
create table if not exists assets (
    id uuid primary key default gen_random_uuid(),
    symbol text not null unique,
    name text not null,
    base text not null,
    quote text not null,
    vendor_ref text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint assets_symbol_allowed check (symbol in ('BTC','ETH','SOL','USDC','USDT','AAVE','LINK','DOGE','BNB','XRP'))
);

-- Ingestion runs metadata
create table if not exists ingestion_runs (
    id uuid primary key default gen_random_uuid(),
    asset_symbol text not null references assets(symbol),
    interval ohlcv_interval not null,
    started_at timestamptz not null default now(),
    ended_at timestamptz,
    status ingestion_status not null,
    row_count integer not null default 0 check (row_count >= 0),
    checksum_sha256 text not null default '',
    checksum_version smallint not null default 1,
    error_summary text,
    attempt smallint not null default 1 check (attempt >= 1),
    trigger ingestion_trigger not null default 'scheduled',
    backfill_window_start timestamptz,
    backfill_window_end timestamptz,
    constraint ingestion_runs_end_after_start check (ended_at is null or ended_at >= started_at)
);
create index if not exists idx_ingestion_runs_asset_interval on ingestion_runs (asset_symbol, interval, started_at desc);

-- OHLCV daily candles
create table if not exists ohlcv_day (
    id bigserial primary key,
    asset_symbol text not null references assets(symbol),
    bucket_start timestamptz not null,
    interval ohlcv_interval not null default 'day',
    open numeric not null check (open >= 0),
    high numeric not null check (high >= 0),
    low numeric not null check (low >= 0),
    close numeric not null check (close >= 0),
    volume numeric not null check (volume >= 0),
    run_id uuid references ingestion_runs(id),
    source_vendor text,
    fetched_at timestamptz not null default now(),
    constraint ohlcv_day_unique unique (asset_symbol, bucket_start, interval),
    constraint ohlcv_day_bucket_aligned check (date_trunc('day', bucket_start) = bucket_start)
);
create index if not exists idx_ohlcv_day_asset_bucket on ohlcv_day (asset_symbol, bucket_start desc);

-- OHLCV minute candles
create table if not exists ohlcv_minute (
    id bigserial primary key,
    asset_symbol text not null references assets(symbol),
    bucket_start timestamptz not null,
    interval ohlcv_interval not null default 'minute',
    open numeric not null check (open >= 0),
    high numeric not null check (high >= 0),
    low numeric not null check (low >= 0),
    close numeric not null check (close >= 0),
    volume numeric not null check (volume >= 0),
    run_id uuid references ingestion_runs(id),
    source_vendor text,
    fetched_at timestamptz not null default now(),
    constraint ohlcv_minute_unique unique (asset_symbol, bucket_start, interval),
    constraint ohlcv_minute_bucket_aligned check (date_trunc('minute', bucket_start) = bucket_start)
);
create index if not exists idx_ohlcv_minute_asset_bucket on ohlcv_minute (asset_symbol, bucket_start desc);

-- Lineage records per bucket
create table if not exists lineage (
    id uuid primary key default gen_random_uuid(),
    asset_symbol text not null references assets(symbol),
    bucket_start timestamptz not null,
    interval ohlcv_interval not null,
    run_id uuid not null references ingestion_runs(id),
    source_vendor text,
    fetched_at timestamptz not null default now(),
    checksum_sha256 text not null,
    checksum_version smallint not null default 1,
    constraint lineage_unique unique (asset_symbol, bucket_start, interval)
);
create index if not exists idx_lineage_asset_bucket on lineage (asset_symbol, bucket_start desc);

-- Remediation log
create table if not exists remediation_log (
    id uuid primary key default gen_random_uuid(),
    asset_symbol text not null references assets(symbol),
    interval ohlcv_interval not null,
    range_start timestamptz not null,
    range_end timestamptz not null,
    issue_type issue_type not null,
    detected_at timestamptz not null default now(),
    run_id uuid references ingestion_runs(id),
    notes text,
    resolved boolean not null default false,
    resolved_at timestamptz,
    constraint remediation_range_valid check (range_end >= range_start)
);
create index if not exists idx_remediation_asset_range on remediation_log (asset_symbol, interval, range_start desc);

-- Alert events for freshness
create table if not exists alert_events (
    id uuid primary key default gen_random_uuid(),
    asset_symbol text not null references assets(symbol),
    interval ohlcv_interval not null,
    detected_at timestamptz not null default now(),
    lag_minutes integer not null check (lag_minutes >= 0),
    threshold_minutes integer not null default 60 check (threshold_minutes > 0),
    status alert_state not null,
    notified_at timestamptz,
    cleared_at timestamptz,
    notification_channel text not null default 'email',
    run_id uuid references ingestion_runs(id)
);
create index if not exists idx_alert_events_asset_interval on alert_events (asset_symbol, interval, detected_at desc);

-- Optional vendor status cache
create table if not exists vendor_status (
    vendor text primary key,
    status vendor_state not null,
    checked_at timestamptz not null default now(),
    details jsonb
);
create index if not exists idx_vendor_status_checked_at on vendor_status (checked_at desc);
