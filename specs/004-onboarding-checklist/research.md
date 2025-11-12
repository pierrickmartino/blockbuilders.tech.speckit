# Phase 0 Research – Onboarding & First-Run Checklist

## Unknowns Resolution

### Analytics Dashboard Platform
- Decision: Build the onboarding funnel dashboard in Datadog Dashboards, leveraging the constitution-mandated observability stack and existing growth workspace alerts.
- Rationale: Datadog is already the approved telemetry surface, supports cohort filters via faceted metrics, and integrates with our alerting budget for >20% day-over-day drops, avoiding a new BI tool.
- Alternatives considered: Metabase (would add another BI dependency and auth path) and custom Next.js analytics pages (would duplicate functionality already available in Datadog and increase maintenance).

### Analytics Warehouse / Event Store
- Decision: Persist onboarding events in Supabase Postgres (`onboarding_events` table) and stream them to Datadog via the existing event forwarder so dashboards and alerting share a single source of truth.
- Rationale: Supabase already stores user + workspace context with RLS, making joins trivial, and the forwarder keeps Datadog metrics hydrated without building a new pipeline.
- Alternatives considered: Snowflake (no managed account yet, higher operational load) and BigQuery (would require separate ingestion tooling and stakeholder re-training).

## Dependency Best Practices

### Next.js 15 (App Router)
- Decision: Implement the checklist as a server component shell with client-component islands for interactivity, using Route Handlers for onboarding APIs and caching per-session data with `revalidateTag` on mutation.
- Rationale: Server components keep initial payload small for the ≤5s render target, while route handlers colocate Supabase writes with Next.js infra and tag-based revalidation ensures progress persists after state changes.
- Alternatives considered: Pure client-side rendering (would slow first paint and duplicate persistence logic) and legacy `pages/` router (deprecated, inconsistent with repo standards).

### React 19
- Decision: Opt into React 19 concurrent features (useTransition/useOptimistic) for checklist interactions and template selection feedback, keeping UI responsive while Supabase mutations settle.
- Rationale: Concurrent rendering smooths step completion animations and prevents double submits during telemetry batching.
- Alternatives considered: Blocking updates via classic setState (risks dropped frames) or custom event queues (rewrite of capabilities React already provides).

### Tailwind CSS 3.4 + shadcn/ui
- Decision: Compose checklist UI using design tokens exported via Tailwind config and wrap steps/disclosures/progress inside shadcn primitives (Accordion, Progress, Dialog) to retain WCAG compliance.
- Rationale: Tokens ensure visual consistency and shadcn components already meet accessibility expectations, minimizing net-new CSS.
- Alternatives considered: Custom CSS modules (higher maintenance, harder to theme) and third-party UI kits (do not match brand tokens).

### React Flow
- Decision: Load React Flow as a dynamic client component for the template canvas, initialize nodes/edges from template metadata, and emit selection events upward so the checklist can resolve when the canvas primes.
- Rationale: Dynamic import keeps bundle size in check, and React Flow's controlled state model mirrors the checklist's persistence needs.
- Alternatives considered: Custom canvas rendering (reinvents graph tooling) and embedding existing strategy canvas without React Flow (would block requirement to reuse React Flow per user input).

### Supabase JS Client + Auth Helpers
- Decision: Use Supabase server clients in Route Handlers/server actions for writes (benefiting from service role) and the client-side helper only for optimistic progress updates; enforce RLS policies on checklist tables.
- Rationale: Server-side writes keep secrets off the client, while RLS ensures per-user isolation even when sharing workspaces.
- Alternatives considered: Direct REST fetches to Supabase Edge Functions (more latency, duplicate auth wiring) and storing progress locally (violates persistence requirement).

### FastAPI (apps/backend)
- Decision: Expose onboarding webhook + analytics ingestion endpoints via FastAPI, reusing shared auth dependencies and background tasks for telemetry batching before forwarding to Supabase/Datadog.
- Rationale: FastAPI already powers backend automation, integrates with uvicorn workers, and supports typed contracts using Pydantic v2.
- Alternatives considered: Building endpoints inside Next.js Route Handlers only (misses Python analytics tooling reuse) or creating a new microservice (unnecessary overhead).

### Pydantic v2
- Decision: Model onboarding events, checklist steps, and template payloads with `BaseModel` + `TypeAdapter`, enabling strict validation and schema export for OpenAPI + analytics docs.
- Rationale: Pydantic v2's `model_validate` handles union payloads (e.g., step progress vs. template selection) with good performance and integrates with FastAPI's response models.
- Alternatives considered: Marshmallow (not in stack) and ad-hoc dict validation (error-prone, lacks schema generation).

## Integration Patterns

### Next.js ↔ Supabase Checklist Persistence
- Decision: Use Supabase Row Level Security with service-role interactions from Route Handlers and emit `revalidateTag('onboarding-checklist')` after writes so the App Router fetchers stay in sync.
- Rationale: Keeps sensitive keys off the client while ensuring SSR data stays fresh without full cache invalidations.
- Alternatives considered: Client-only Supabase updates (exposes keys, race conditions) and custom API inside FastAPI only (adds an extra hop for UI reads).

### Checklist ↔ React Flow Canvas
- Decision: When a template is chosen, serialize template metadata into a shared `TemplatePrimingContext` that both the checklist and React Flow canvas consume, marking the checklist step complete only after the canvas dispatches a `primed` event.
- Rationale: Prevents prematurely completing the step if canvas initialization fails and guarantees the user sees the primed strategy before telemetry logs completion.
- Alternatives considered: Fire-and-forget completion on click (risks false positives) and polling the canvas state (wastes resources, introduces latency).

### Telemetry Pipeline ↔ Analytics Dashboards
- Decision: Emit structured onboarding events from both frontend (via first-party SDK) and backend (FastAPI) into Supabase, then forward to Datadog using the existing event forwarder so dashboards and alerts use the same dataset.
- Rationale: Aligns with constitution observability standards and ensures funnel metrics + alerting share identical data, simplifying validation.
- Alternatives considered: Client-only logging to 3rd-party tools (compliance risk) and manual CSV exports for dashboards (not real time, no alerting).
