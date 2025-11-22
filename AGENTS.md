# blockbuilders.tech.speckit Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-29

## Active Technologies
- TypeScript (Node.js 20 LTS), Python 3.12 + Next.js 15 App Router, React 19, Supabase JavaScript client with Next.js auth helpers, FastAPI, Pydantic v2, planned Supabase Python/JWT tooling (002-supabase-email-auth)
- Supabase Postgres (hosted) (002-supabase-email-auth)
- TypeScript (Next.js 15 App Router, React 19) + Tailwind CSS 3.4, shadcn/ui (Radix primitives), Storybook 10 with @storybook/addon-a11y, Supabase client (existing auth plumbing), Zod 3 (003-design-system-tokens)
- N/A (tokens defined in JSON/TypeScript schema and emitted to CSS variables) (003-design-system-tokens)
- TypeScript (Node.js 20 LTS) for Next.js 15 App Router + React 19; Python 3.12 for FastAPI services + Next.js 15, React 19, Tailwind CSS 3.4, shadcn/ui, React Flow for canvas priming, Supabase JS client + auth helpers, FastAPI, Pydantic v2, Datadog Dashboards + event forwarder (004-onboarding-checklist)
- Supabase Postgres (checklist state, template selections, overrides) with Datadog metrics fed from the Supabase event forwarder for funnel dashboards (004-onboarding-checklist)
- TypeScript (Node.js 20 LTS, Next.js 15 App Router) + Python 3.12 (FastAPI services) + React 19, Tailwind CSS 3.4 + shadcn/ui tokens, Supabase JS client + auth helpers, Supabase Postgres RPC/API layer, FastAPI + Pydantic v2, Datadog forwarder (004-onboarding-checklist)
- Supabase Postgres (onboarding state, template metadata, audit logs) (004-onboarding-checklist)
- TypeScript on Node.js 20 (Next.js 15 App Router, React 19) plus Python 3.12 (FastAPI service tier). + Tailwind CSS 3.4 tokens, shadcn/ui primitives, React Flow for canvas priming, Supabase JS client + auth helpers, Supabase Postgres schemas, FastAPI + Pydantic v2, Datadog forwarder, Vitest/Playwright, Ruff/Pytest. (004-onboarding-checklist)
- Supabase Postgres (onboarding checklist definitions, per-user progress, template selections, telemetry queues). (004-onboarding-checklist)

- TypeScript (Node.js 20 LTS) + Python 3.12 + Next.js 15 (React 19), Tailwind CSS, FastAPI, Pydantic v2, pnpm, uv (001-bootstrap-monorepo)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

cd src [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] pytest [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] ruff check .

## Code Style

TypeScript (Node.js 20 LTS) + Python 3.12: Follow standard conventions

## Recent Changes
- 004-onboarding-checklist: Added TypeScript on Node.js 20 (Next.js 15 App Router, React 19) plus Python 3.12 (FastAPI service tier). + Tailwind CSS 3.4 tokens, shadcn/ui primitives, React Flow for canvas priming, Supabase JS client + auth helpers, Supabase Postgres schemas, FastAPI + Pydantic v2, Datadog forwarder, Vitest/Playwright, Ruff/Pytest.
- 004-onboarding-checklist: Added TypeScript (Node.js 20 LTS, Next.js 15 App Router) + Python 3.12 (FastAPI services) + React 19, Tailwind CSS 3.4 + shadcn/ui tokens, Supabase JS client + auth helpers, Supabase Postgres RPC/API layer, FastAPI + Pydantic v2, Datadog forwarder
- 004-onboarding-checklist: Added TypeScript (Node.js 20 LTS) for Next.js 15 App Router + React 19; Python 3.12 for FastAPI services + Next.js 15, React 19, Tailwind CSS 3.4, shadcn/ui, React Flow for canvas priming, Supabase JS client + auth helpers, FastAPI, Pydantic v2, Datadog Dashboards + event forwarder


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
