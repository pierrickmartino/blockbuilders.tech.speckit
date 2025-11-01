# Tasks: Supabase Email Auth Integration

**Input**: Design documents from `/specs/002-supabase-email-auth/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bring Supabase dependencies into the mono-repo so authentication work can compile and run.

- [ ] T001 Add Supabase client packages (`@supabase/supabase-js`, `@supabase/ssr`) to apps/frontend/package.json
- [ ] T002 [P] Add Supabase JWT verification dependencies (`python-jose[cryptography]`, `cachetools`, runtime `httpx`) to apps/backend/pyproject.toml

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared Supabase configuration, client factories, and settings that every story relies on.

- [ ] T003 Create Supabase environment schema helper in apps/frontend/lib/supabase/env.ts reading validated `process.env`
- [ ] T004 [P] Implement Supabase client factories (browser/server) in apps/frontend/lib/supabase/clients.ts using `@supabase/ssr`
- [ ] T005 [P] Define typed Supabase auth session and profile interfaces in apps/frontend/lib/supabase/types.ts
- [ ] T006 Add Supabase cookie utilities for middleware/server parity in apps/frontend/lib/supabase/cookies.ts
- [ ] T007 Introduce Supabase settings model with JWKS fields in apps/backend/app/core/settings_supabase.py
- [ ] T008 [P] Wire Supabase settings into apps/backend/app/core/settings.py and ensure app/main.py loads them at startup

---

## Phase 3: User Story 1 - Complete email registration and sign-in (Priority: P1) 🎯 MVP

**Goal**: Deliver Supabase-backed sign-up/sign-in flows with password policy enforcement, error handling, and email verification gating.

**Independent Test**: Run Playwright against `/auth/sign-up` and `/auth/sign-in` to cover success, loading, and error states using Supabase; confirm unverified accounts are redirected to the verification screen.

### Tests for User Story 1 ⚠️

- [ ] T009 [P] [US1] Add Vitest password policy and error-state coverage in apps/frontend/tests/unit/auth/passwordPolicy.spec.ts
- [ ] T010 [P] [US1] Record Playwright sign-up/sign-in journey with verification gate in apps/frontend/tests/e2e/auth-sign-up.spec.ts

### Implementation for User Story 1

- [ ] T011 [US1] Implement password policy validator enforcing 12+ mixed characters in apps/frontend/lib/auth/passwordPolicy.ts
- [ ] T012 [P] [US1] Map Supabase auth error codes to friendly copy in apps/frontend/lib/auth/errorMap.ts
- [ ] T013 [US1] Create Supabase-backed sign-up route handler with redirect support in apps/frontend/app/api/auth/sign-up/route.ts
- [ ] T014 [US1] Create Supabase-backed sign-in route handler in apps/frontend/app/api/auth/sign-in/route.ts
- [ ] T015 [P] [US1] Implement sign-out route clearing Supabase cookies in apps/frontend/app/api/auth/sign-out/route.ts
- [ ] T016 [P] [US1] Expose `/api/auth/session` handler returning Supabase session payload in apps/frontend/app/api/auth/session/route.ts
- [ ] T017 [US1] Build accessible sign-up page with loading/error states in apps/frontend/app/(auth)/sign-up/page.tsx
- [ ] T018 [US1] Build accessible sign-in page with loading/error states in apps/frontend/app/(auth)/sign-in/page.tsx
- [ ] T019 [US1] Implement verify-email screen with resend flow in apps/frontend/app/(auth)/verify/page.tsx
- [ ] T020 [US1] Add shared auth form UI components (inputs, submit button) in apps/frontend/components/auth/AuthForm.tsx
- [ ] T021 [US1] Surface Supabase auth toast + routing helpers in apps/frontend/components/auth/AuthStatusToaster.tsx

**Checkpoint**: Sign-up/sign-in flows, error handling, and verification gate work end-to-end with automated coverage.

---

## Phase 4: User Story 2 - Persist sessions and guard protected surfaces (Priority: P1)

**Goal**: Maintain Supabase sessions across navigation and enforce redirects or context hydration on protected routes.

**Independent Test**: Automate a session persistence Playwright run that signs in, reloads, hits protected pages, expires the session, and confirms redirect behavior with return-to context.

### Tests for User Story 2 ⚠️

- [ ] T022 [P] [US2] Add Playwright session persistence + expiry coverage in apps/frontend/tests/e2e/auth-session.spec.ts
- [ ] T023 [P] [US2] Add Vitest coverage for Supabase session broadcast helpers in apps/frontend/tests/unit/auth/sessionChannel.spec.ts

### Implementation for User Story 2

- [ ] T024 [US2] Implement SupabaseSessionProvider to hydrate client context in apps/frontend/components/auth/SupabaseSessionProvider.tsx
- [ ] T025 [US2] Ship `useSupabaseSession` hook for components in apps/frontend/lib/auth/useSupabaseSession.ts
- [ ] T026 [US2] Enforce authentication and email verification redirect logic in apps/frontend/middleware.ts
- [ ] T027 [US2] Guard protected layouts with server-side session checks in apps/frontend/app/(protected)/layout.tsx
- [ ] T028 [P] [US2] Hydrate protected dashboard sample with session-aware data in apps/frontend/app/(protected)/dashboard/page.tsx
- [ ] T029 [US2] Provide sign-out control wired to API in apps/frontend/components/auth/SignOutButton.tsx
- [ ] T030 [US2] Implement Supabase broadcast channel listener for multi-tab sync in apps/frontend/lib/auth/sessionChannel.ts

**Checkpoint**: Authenticated sessions persist, guards redirect unauthenticated or unverified users, and APIs respect return paths.

---

## Phase 5: User Story 3 - Enforce server-side authorization (Priority: P2)

**Goal**: Verify Supabase JWTs on the FastAPI backend, expose a protected `/me` endpoint, and codify RLS policies.

**Independent Test**: Run pytest suites that validate JWKS verification (valid/invalid tokens) and call `/me` with authorized and unauthorized headers, plus Supabase SQL policy checks.

### Tests for User Story 3 ⚠️

- [ ] T031 [P] [US3] Add JWKS cache + negative token unit tests in apps/backend/tests/unit/test_supabase_jwks.py
- [ ] T032 [P] [US3] Add `/me` integration tests covering 200/401 cases in apps/backend/tests/integration/test_me_endpoint.py
- [ ] T033 [P] [US3] Track RLS policy assertions via Supabase SQL fixtures in apps/backend/tests/integration/test_supabase_policies.sql

### Implementation for User Story 3

- [ ] T034 [US3] Implement JWKS cache utility with TTL refresh in apps/backend/app/services/supabase/jwks_cache.py
- [ ] T035 [US3] Implement Supabase JWT verifier enforcing iss/aud/email in apps/backend/app/services/supabase/jwt_verifier.py
- [ ] T036 [US3] Provide FastAPI dependency for authenticated user context in apps/backend/app/dependencies/supabase.py
- [ ] T037 [US3] Implement `/me` router exposing profile payload in apps/backend/app/api/routes/me.py
- [ ] T038 [US3] Register auth router in apps/backend/app/factory.py and expose under `/me`
- [ ] T039 [US3] Version Supabase RLS policies for protected tables in apps/backend/app/db/policies/auth_access.sql
- [ ] T040 [US3] Emit structured auth logging hooks in apps/backend/app/services/supabase/logging.py

**Checkpoint**: Backend rejects invalid tokens, returns typed profiles for valid sessions, and RLS policies live in version control.

---

## Phase 6: User Story 4 - Operationalize Supabase configuration (Priority: P2)

**Goal**: Document, template, and automate Supabase environment configuration for local, CI, and production.

**Independent Test**: Follow the quickstart from a clean machine, populate env files, run CI pipeline scripts, and confirm auth flows succeed without manual Supabase console steps.

### Implementation for User Story 4

- [ ] T041 [P] [US4] Create frontend Supabase `.env.example` documenting public vars in apps/frontend/.env.example
- [ ] T042 [P] [US4] Create backend Supabase `.env.example` documenting server vars in apps/backend/.env.example
- [ ] T043 [US4] Update configs/ENVIRONMENT.md with Supabase auth, JWT, and email settings contracts
- [ ] T044 [US4] Extend docs/QUICKSTART.md with Supabase bootstrap and password policy checklist
- [ ] T045 [US4] Add CI secrets template for Supabase keys in configs/ci/supabase.env.tpl
- [ ] T046 [US4] Document key rotation and resend procedures in docs/TROUBLESHOOTING.md

**Checkpoint**: Any teammate can configure Supabase across environments using the documented templates and scripts.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Harden logging, analytics, accessibility, and documentation across the auth surface.

- [ ] T047 [P] Emit structured auth analytics events for sign-in/out in apps/frontend/lib/telemetry/authEvents.ts
- [ ] T048 Capture backend auth metrics and redaction safeguards in apps/backend/app/main.py
- [ ] T049 [P] Validate quickstart by executing specs/002-supabase-email-auth/quickstart.md and log gaps in docs/RELEASE_CHECKLIST.md

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2**: Supabase dependencies (T001–T002) must land before configuration modules (T003–T008).
- **Phase 2 → Phases 3–6**: Foundational Supabase helpers unblock all user stories; US1/US2 use frontend clients, US3 relies on backend settings, US4 references documented variables.
- **User Stories**: Execute in priority order US1 (P1) → US2 (P1) → US3 (P2) → US4 (P2). Each story is self-contained once Phases 1–2 complete.
- **Polish**: T047–T049 run after story checkpoints to avoid invalidating earlier verification.

---

## Parallel Execution Opportunities

- [P] tasks across phases can run concurrently when dependencies are satisfied: e.g., T004 + T005, T012 + T015, T022 + T023, T031 + T032, T041 + T042.
- Separate teams can split stories after Phase 2—frontend focuses on US1/US2 while backend tackles US3, and operations handles US4.
- Testing tasks marked [P] may execute as soon as supporting modules exist, enabling fail-first workflows without blocking implementation.

---

## Implementation Strategy

1. **MVP (US1)**: Finish Phases 1–3 to ship sign-up/sign-in with verification, ensuring Playwright + Vitest coverage pass.
2. **Session Hardening (US2)**: Layer session persistence and guards, validating redirect and broadcast behaviour before touching backend work.
3. **Server Authorization (US3)**: Implement backend verification and `/me` endpoint, coordinating with Supabase policy migrations and pytest suites.
4. **Operational Readiness (US4)**: Finalize env templates, CI secrets, and quickstart so onboarding and deployments are repeatable.
5. **Polish**: Execute analytics, metrics, and quickstart validation to satisfy constitution-level quality gates.

