# Tasks: Supabase Email Auth Integration

**Input**: Design documents from `/specs/002-supabase-email-auth/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bring Supabase dependencies into the mono-repo so authentication work can compile and run.

- [X] T001 Add Supabase client packages (`@supabase/supabase-js`, `@supabase/ssr`) to apps/frontend/package.json
- [X] T002 [P] Add Supabase JWT verification dependencies (`python-jose[cryptography]`, `cachetools`, runtime `httpx`) to apps/backend/pyproject.toml

---

## Phase 2: Foundational (Blocking Prerequisites)

### Tests for Phase 2 ⚠️
    - [X] T002a [P] Validate Supabase env schema helper via Vitest, asserting required keys and failure modes in apps/frontend/tests/unit/supabase/envSchema.spec.ts
    - [X] T004a [P] Add Next.js server/client integration test proving per-request Supabase singleton behavior in apps/frontend/tests/integration/supabaseClientSingleton.spec.ts
    - [X] T006a [P] Exercise middleware/server cookie parity with Playwright or node-test harness in apps/frontend/tests/integration/supabaseCookies.spec.ts

**Purpose**: Establish shared Supabase configuration, client factories, and settings that every story relies on.

- [X] T003 Create Supabase environment schema helper in apps/frontend/lib/supabase/env.ts reading validated `process.env`
- [X] T004 [P] Implement Supabase client factories (browser/server) in apps/frontend/lib/supabase/clients.ts using `@supabase/ssr`
- [X] T005 [P] Define typed Supabase auth session and profile interfaces in apps/frontend/lib/supabase/types.ts
- [X] T006 Add Supabase cookie utilities for middleware/server parity in apps/frontend/lib/supabase/cookies.ts
- [X] T007 Introduce Supabase settings model with JWKS fields in apps/backend/app/core/settings_supabase.py
- [X] T008 [P] Wire Supabase settings into apps/backend/app/core/settings.py and ensure app/main.py loads them at startup

---

## Phase 3: User Story 1 - Complete email registration and sign-in (Priority: P1) 🎯 MVP

**Goal**: Deliver Supabase-backed sign-up/sign-in flows with password policy enforcement, error handling, and email verification gating.

**Independent Test**: Run Playwright against `/auth/sign-up` and `/auth/sign-in` to cover success, loading, and error states using Supabase; confirm unverified accounts are redirected to the verification screen.

### Tests for User Story 1 ⚠️

- [X] T009 [P] [US1] Add Vitest password policy and error-state coverage in apps/frontend/tests/unit/auth/passwordPolicy.spec.ts
- [X] T010 [P] [US1] Record Playwright sign-up/sign-in journey with verification gate in apps/frontend/tests/e2e/auth-sign-up.spec.ts
- [X] T010a [P] [US1] Run Playwright + @axe-core accessibility sweeps and manual keyboard walkthroughs across /auth/sign-up, /auth/sign-in, and /auth/verify to document WCAG 2.2 AA compliance
- [X] T010b [P] [US1] Simulate rapid double-submit of sign-up/sign-in forms in Playwright and assert only a single Supabase request is issued per action
- [X] T010c [US1] Add Playwright negative cases that submit sign-up/sign-in without CSRF tokens and assert rejection
- [X] T010d [US1] Publish Playwright run stats (≥20 executions) to CI artifacts to evidence SC-AUTH threshold
- [X] T010e [P] [US1] Capture password policy Playwright stats (artifact `artifacts/auth-password-policy.json`) and fail when <95% compliant submissions succeed

### Implementation for User Story 1

- [X] T011 [US1] Implement password policy validator enforcing 12+ mixed characters in apps/frontend/lib/auth/passwordPolicy.ts
- [X] T011a [US1] Provide legacy-user safeguards for tighter password rules (grace period, targeted reset prompts, copy updates) with unit coverage that preserves existing logins until reset
- [X] T012 [P] [US1] Map Supabase auth error codes to friendly copy in apps/frontend/lib/auth/errorMap.ts
- [X] T013 [US1] Create Supabase-backed sign-up route handler with redirect support in apps/frontend/app/api/auth/sign-up/route.ts
- [X] T014 [US1] Create Supabase-backed sign-in route handler in apps/frontend/app/api/auth/sign-in/route.ts
- [X] T015 [P] [US1] Implement sign-out route clearing Supabase cookies in apps/frontend/app/api/auth/sign-out/route.ts
- [X] T016 [P] [US1] Expose `/api/auth/session` handler returning Supabase session payload in apps/frontend/app/api/auth/session/route.ts
- [X] T017 [US1] Build accessible sign-up page with loading/error states in apps/frontend/app/(auth)/sign-up/page.tsx
- [X] T018 [US1] Build accessible sign-in page with loading/error states in apps/frontend/app/(auth)/sign-in/page.tsx
- [X] T019 [US1] Implement verify-email screen with resend flow in apps/frontend/app/(auth)/verify/page.tsx
- [X] T020 [US1] Add shared auth form UI components (inputs, submit button) in apps/frontend/components/auth/AuthForm.tsx
- [X] T021 [US1] Surface Supabase auth toast + routing helpers in apps/frontend/components/auth/AuthStatusToaster.tsx
- [X] T013a [US1] Add client/server guards to prevent duplicate Supabase auth submissions and document retry behavior
- [X] T014a [US1] Inject CSRF tokens into auth forms and enforce validation in sign-up/sign-in route handlers

**Checkpoint**: Sign-up/sign-in flows, error handling, and verification gate work end-to-end with automated coverage.

---

## Phase 4: User Story 2 - Persist sessions and guard protected surfaces (Priority: P1)

**Goal**: Maintain Supabase sessions across navigation and enforce redirects or context hydration on protected routes.

**Independent Test**: Automate a session persistence Playwright run that signs in, reloads, hits protected pages, expires the session, and confirms redirect behavior with return-to context.

### Tests for User Story 2 ⚠️

- [X] T022 [P] [US2] Add Playwright session persistence + expiry coverage in apps/frontend/tests/e2e/auth-session.spec.ts
- [X] T023 [P] [US2] Add Vitest coverage for Supabase session broadcast helpers in apps/frontend/tests/unit/auth/sessionChannel.spec.ts
- [X] T022a [P] [US2] Simulate 30-minute inactivity (token aging/time travel) and capture Next.js Web Vitals plus FastAPI p95 latency to prove SC-SESSION and performance budgets hold
- [X] T022b [P] [US2] Run session persistence Playwright flow with third-party cookies disabled and confirm fallback storage keeps users signed in

### Implementation for User Story 2

- [X] T024 [US2] Implement SupabaseSessionProvider to hydrate client context in apps/frontend/components/auth/SupabaseSessionProvider.tsx
- [X] T025 [US2] Ship `useSupabaseSession` hook for components in apps/frontend/lib/auth/useSupabaseSession.ts
- [X] T026 [US2] Enforce authentication and email verification redirect logic in apps/frontend/middleware.ts
- [X] T027 [US2] Guard protected layouts with server-side session checks in apps/frontend/app/(protected)/layout.tsx
- [X] T028 [P] [US2] Hydrate protected dashboard sample with session-aware data in apps/frontend/app/(protected)/dashboard/page.tsx
- [X] T029 [US2] Provide sign-out control wired to API in apps/frontend/components/auth/SignOutButton.tsx
- [X] T030 [US2] Implement Supabase broadcast channel listener for multi-tab sync in apps/frontend/lib/auth/sessionChannel.ts
- [X] T024a [US2] Configure Supabase auth storage fallback for cookie-restricted browsers and document toggle locations
- [X] T024b [US2] Implement Supabase outage fallback messaging, retry/backoff logic, and operator alert hooks; cover the negative path in Playwright + documentation
- [X] T030a [P] [US2] Instrument session integration test verifying singleton client reuse and no cross-request leakage in apps/frontend/tests/integration/sessionSingleton.spec.ts

**Checkpoint**: Authenticated sessions persist, guards redirect unauthenticated or unverified users, and APIs respect return paths.

---

## Phase 5: User Story 3 - Enforce server-side authorization (Priority: P2)

**Goal**: Verify Supabase JWTs on the FastAPI backend, expose a protected `/me` endpoint, and codify RLS policies.

**Independent Test**: Run pytest suites that validate JWKS verification (valid/invalid tokens) and call `/me` with authorized and unauthorized headers, plus Supabase SQL policy checks.

### Tests for User Story 3 ⚠️

- [X] T031 [P] [US3] Add JWKS cache + negative token unit tests in apps/backend/tests/unit/test_supabase_jwks.py
- [X] T032 [P] [US3] Add `/me` integration tests covering 200/401 cases in apps/backend/tests/integration/test_me_endpoint.py
- [X] T032a [US3] Ensure FastAPI `/me` rejects requests missing CSRF token when session cookies are present
- [X] T033 [P] [US3] Track RLS policy assertions via Supabase SQL fixtures in apps/backend/tests/integration/test_supabase_policies.sql
- [X] T033a [US3] Record `/me` endpoint latency during pytest load run and fail CI if p95 exceeds 200 ms, attaching metrics to the build artifacts

### Implementation for User Story 3

- [X] T034 [US3] Implement JWKS cache utility with TTL refresh in apps/backend/app/services/supabase/jwks_cache.py
- [X] T035 [US3] Implement Supabase JWT verifier enforcing iss/aud/email in apps/backend/app/services/supabase/jwt_verifier.py
- [X] T036 [US3] Provide FastAPI dependency for authenticated user context in apps/backend/app/dependencies/supabase.py
- [X] T037 [US3] Implement `/me` router exposing profile payload in apps/backend/app/api/routes/me.py
- [X] T038 [US3] Register auth router in apps/backend/app/factory.py and expose under `/me`
- [X] T039 [US3] Version Supabase RLS policies for protected tables in apps/backend/app/db/policies/auth_access.sql
- [X] T040 [US3] Emit structured auth logging hooks in apps/backend/app/services/supabase/logging.py
- [X] T035a [US3] Wire CSRF validation middleware or dependency into Supabase JWT verifier pipeline

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
- [ ] T045a [US4] Script Supabase secret sync to Vercel/GitHub Actions and archive run logs in configs/scripts/sync_supabase_secrets.sh
- [ ] T045b [US4] Add CI parity check ensuring runtime secrets match templates, failing build when drift detected
- [ ] T046a [US4] Run timed Supabase bootstrap drill on clean machine, documenting duration <20 minutes in docs/RELEASE_CHECKLIST.md
- [ ] T046b [US4] Execute two consecutive CI deployments with shared secrets and attach verification logs to pipeline artifacts

**Checkpoint**: Any teammate can configure Supabase across environments using the documented templates and scripts.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Harden logging, analytics, accessibility, and documentation across the auth surface.

- [ ] T047 [P] Emit structured auth analytics events for sign-in/out in apps/frontend/lib/telemetry/authEvents.ts
- [ ] T048 Capture backend auth metrics and redaction safeguards in apps/backend/app/main.py
- [ ] T049 [P] Validate quickstart by executing specs/002-supabase-email-auth/quickstart.md and log gaps in docs/RELEASE_CHECKLIST.md
- [ ] T047a [P] Capture auth telemetry fixture validating schema and PII redaction in apps/frontend/tests/unit/telemetry/authEvents.spec.ts
- [ ] T048a Ensure backend auth logging emits approved fields only by adding schema enforcement test in apps/backend/tests/unit/test_auth_logging.py

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
