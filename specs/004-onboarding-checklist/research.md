# Phase 0 Research — 004-onboarding-checklist (2025-11-12)

## Decision 1: Supabase Postgres for checklist persistence & resets
- **Rationale**: Reuses the existing Supabase cluster to store `OnboardingChecklist`, `ChecklistStepProgress`, and `StarterTemplateSelection` tables with versioned foreign keys so per-user progress, disclosure acknowledgements, and overrides are transactional and enforce FR-002/FR-007 reset semantics without a new datastore.
- **Alternatives considered**:
  - Client-only storage (localStorage/indexedDB) — rejected because it fails shared workspace guarantees, breaks device switching, and cannot handle definition resets.
  - Redis cache in front of Supabase — rejected because p95<200 ms targets are achievable with tuned Postgres indexes and Redis would complicate audit logging.

## Decision 2: Next.js 15 Server Actions + Supabase auth helpers
- **Rationale**: Co-locating checklist mutations inside App Router Server Actions keeps tokens off the client, shares Supabase session context, and allows streaming UI updates with minimal client bundle growth while still satisfying the requirement to stay on the approved stack (Next.js 15, React 19, Tailwind, shadcn/ui).
- **Alternatives considered**:
  - Client-side fetch to FastAPI only — rejected because every request would need redundant auth plumbing and increases exposure to tampering.
  - GraphQL gateway — rejected since no other feature needs it and the spec prioritizes speed-to-first-backtest over new protocols.

## Decision 3: React Flow canvas priming pipeline
- **Rationale**: Use React Flow’s node/edge schema to represent starter templates, letting the checklist pass serialized parameter diffs into an existing React Flow canvas component so selecting a template instantly renders a runnable draft—meeting the user instruction that the canvas must use React Flow.
- **Alternatives considered**:
  - Custom SVG/canvas implementation — rejected because it duplicates existing canvas work and violates the explicit React Flow requirement.
  - Delayed priming via backend-only draft generation — rejected since users need immediate visual confirmation before editing parameters.

## Decision 4: FastAPI orchestration service for overrides & telemetry enqueue
- **Rationale**: A dedicated FastAPI router (`apps/backend/app/api/onboarding`) owns checklist version hashes, override workflows, Datadog-forward confirmations, and queue fan-out to Supabase functions, ensuring auditability and aligning with Pydantic v2 data validation best practices.
- **Alternatives considered**:
  - Supabase Edge Functions — rejected because complex override auditing + Datadog retries are easier to express/test in Python with shared libs.
  - Embedding everything in Next.js API routes — rejected to avoid long-running jobs inside Vercel edge runtimes and to keep Python telemetry libraries reusable.

## Decision 5: Supabase → Datadog forwarder for analytics
- **Rationale**: Leveraging the existing Supabase→Datadog event forwarder allows us to capture `viewed`, `step_start`, `step_complete`, `template_selected`, `disclosure_ack`, and `override` events with cohort tags, guaranteeing dashboards and funnel KPIs (SC-01–SC-03) remain consistent without duplicating instrumentation SDKs.
- **Alternatives considered**:
  - Direct Datadog RUM instrumentation — rejected due to missing workspace context + extra consent prompts.
  - Building a Kafka-based ingestion path — rejected as overkill for ~10k monthly activations and would add infra not scoped for this iteration.

## Decision 6: Template completion requires parameter edit + draft save guardrails
- **Rationale**: Enforcing a parameter change plus draft save before a template step can reach COMPLETED ensures metrics reflect meaningful user engagement, prevents false positives, and naturally feeds React Flow with explicit diffs for the primed canvas.
- **Alternatives considered**:
  - Auto-complete on template selection — rejected because it fails FR-004 (must modify at least one parameter).
  - Require running a full backtest before completion — rejected since it duplicates the dedicated backtest step and could delay onboarding.

All previously marked unknowns have been resolved through the research tasks above; no open "NEEDS CLARIFICATION" items remain for Phase 1.
