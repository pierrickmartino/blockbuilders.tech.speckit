# Feature Specification: Supabase Email Auth Integration

**Feature Branch**: `002-supabase-email-auth`  
**Created**: 2025-11-01  
**Status**: Draft  
**Input**: The “Supabase Email Auth Integration” initiative will let users create secure, personalized accounts that unlock gated functionality and set the stage for future profile-driven features. We will build dedicated sign-up and sign-in screens on the frontend that manage Supabase authentication flows, display clear loading and error states, and maintain sessions across navigation. On the backend, we will configure Supabase email authentication—including redirect URLs and password policies—while exposing helpers for server-side session validation and tightening RLS policies so authenticated actions happen only where intended. Infrastructure updates will store Supabase keys in project secrets, document the local environment setup, and align deployment configurations with those same values.

## Clarifications

### Session 2025-11-01

- Q: Should protected routes remain blocked until the user verifies their email address? → A: Require email confirmation before protected access.
- Q: What password policy should we enforce during sign-up? → A: Minimum 12 chars with upper/lower/number/symbol.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete email registration and sign-in (Priority: P1)

Product builders need a frictionless sign-up and login journey so they can validate gated functionality and share the experience with stakeholders without touching Supabase dashboards.

**Why this priority**: Without a reliable email/password flow, no one can access forthcoming protected features, blocking product validation and user feedback.

**Independent Test**: Launch Supabase-backed auth locally, run the sign-up and sign-in pages through Playwright, and confirm success, loading, and error states render as specified without manual intervention.

**Acceptance Scenarios**:

1. **Given** Supabase env vars are configured and the sign-up form has client and server validation, **When** a user submits a new email and password meeting policy requirements, **Then** the account is created, an authenticated session starts, and the UI routes to the configured post-auth destination with a success toast.
2. **Given** a user enters invalid credentials or reuses an existing email, **When** they submit either the sign-up or sign-in form, **Then** the UI surfaces the Supabase error code mapped to user-friendly copy, disables the primary action while awaiting the response, and re-enables it for correction.
3. **Given** a newly created account awaiting email confirmation, **When** the user attempts to access protected content, **Then** the app routes them to a “Verify your email” screen and blocks access until Supabase reports the email as confirmed.

---

### User Story 2 - Persist sessions and guard protected surfaces (Priority: P1)

End users expect to stay signed in across reloads and navigation while being redirected to authentication when their session expires to avoid confusing failures on protected routes.

**Why this priority**: Session continuity is core to productivity; unexpected sign-outs or silent failures erode trust in the platform and block feature discovery.

**Independent Test**: Automate a browser flow that signs in, reloads the application, visits a protected route, and validates the session persists; then expire the session token and assert the guard redirects to the sign-in screen with context.

**Acceptance Scenarios**:

1. **Given** a user has successfully signed in, **When** they refresh the app or navigate to a protected route, **Then** the Supabase client restores the session, server-rendered routes receive the authenticated context, and protected content loads without flash-of-unauthenticated states.
2. **Given** a session has expired or the user explicitly signs out, **When** they request a protected page or API, **Then** middleware or server helpers detect the missing session, issue a redirect to the sign-in page, and include a return-to parameter so the user can resume their workflow.

---

### User Story 3 - Enforce server-side authorization (Priority: P2)

Backend services and server components need reliable session validation and row-level security rules so authenticated operations only execute for authorized actors.

**Why this priority**: Without hardened server checks, attackers could bypass client-side protections and access another user’s data, undermining the initiative’s security goals.

**Independent Test**: Run backend unit tests against the session helper with mocked Supabase responses, execute FastAPI integration tests with valid and invalid JWTs, and confirm RLS policies deny cross-tenant access via Supabase SQL tests.

**Acceptance Scenarios**:

1. **Given** a server-side handler wraps requests with the Supabase session helper, **When** a valid session token is provided, **Then** the helper injects the typed user identity into downstream logic; when the token is missing or invalid, it raises a 401 response with no data leakage.
2. **Given** Supabase RLS policies are deployed for the relevant tables, **When** a user attempts to read or mutate records they do not own, **Then** Supabase returns a policy violation and the backend surfaces an authorization error consistent with platform messaging.

---

### User Story 4 - Operationalize Supabase configuration (Priority: P2)

Operators and developers need documented, repeatable Supabase configuration so every environment—local, preview, and production—stays in sync without manual tweaks.

**Why this priority**: Misaligned secrets or auth settings cause login failures during deployments, delaying releases and eroding confidence in the workflow.

**Independent Test**: Follow the environment bootstrap guide on a clean machine, provision Supabase settings via scripts or documented steps, run CI with secrets injected, and verify all flows succeed without console-driven fixes.

**Acceptance Scenarios**:

1. **Given** a teammate follows the documented checklists, **When** they configure Supabase auth settings (redirect URLs, email templates, password policies), **Then** the resulting environment matches the reference configuration and automated smoke tests pass with no additional changes.
2. **Given** CI or deployment pipelines consume Supabase secrets from managed storage, **When** a build runs, **Then** the pipeline has the required env vars, uses the documented service role keys safely, and surfaces alerts if any secret is missing or stale.

### Edge Cases

- Handle double-submit of auth forms to avoid duplicate Supabase requests and ensure idempotency for account creation.
- Support browsers with third-party cookies disabled by persisting sessions via Supabase recommended storage strategy and falling back gracefully.
- Provide clear messaging for the mandatory email confirmation gate, including retry/resend actions while keeping protected content inaccessible until verified.
- Ensure password policy changes roll out without locking existing users out by requesting resets only when required and mapping tighter complexity messaging to the updated 12-character rule set.
- Surface a recoverable path when Supabase maintenance or network interruptions occur during auth operations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-101**: Frontend MUST expose dedicated sign-up and sign-in routes under the `(auth)` segment with responsive, accessible forms and state-specific messaging (Principles: experience, accessibility). Verified by UI review and Playwright flows exercising keyboard navigation and screen-reader labels.
- **FR-102**: Auth forms MUST perform client-side validation aligned with Supabase password policies and display mapped error copy for all Supabase auth error codes (Principles: quality, simplicity). Verified by Vitest unit coverage of the validation schema and mocked Supabase responses.
- **FR-102a**: Password validation MUST enforce a minimum length of 12 characters and require uppercase, lowercase, numeric, and symbol characters, rejecting inputs that fail any rule with actionable error copy (Principles: security, usability). Verified by unit tests covering each rule and Supabase config inspection.
- **FR-103**: Supabase client initialization MUST be available for both server and client contexts, reusing a shared configuration and ensuring singleton behavior per request (Principles: performance, simplicity). Verified by integration tests and code review of dependency injection pattern.
- **FR-104**: Application MUST persist Supabase sessions across reloads using the recommended auth helpers and broadcast updates on sign-in/sign-out events (Principles: experience, reliability). Verified by Playwright persistence test and manual reload checks.
- **FR-105**: Protected routes MUST enforce authentication via Next.js middleware and layout guards that redirect unauthenticated visitors with return path metadata (Principles: security, experience). Verified by Playwright tests exercising protected pages and middleware unit tests.
- **FR-105a**: Users MUST confirm their email address before gaining access to protected routes, with the UI routing unverified sessions to a verification screen and retrying once Supabase marks the email as confirmed (Principles: security, compliance). Verified by Playwright scenarios covering unverified accounts and unit tests of session guard logic.
- **FR-106**: Backend FastAPI services MUST include a Supabase session validation helper that enforces JWT verification, surfaces typed user context, and fails closed on errors (Principles: security, quality). Verified by pytest unit and integration suites with valid/invalid tokens.
- **FR-107**: Supabase RLS policies MUST restrict data access to the authenticated user or authorized roles, with migrations or SQL scripts tracked in version control (Principles: security, compliance). Verified by Supabase SQL tests or automated policy assertions in CI.
- **FR-108**: Environment management MUST centralize Supabase keys, redirect URLs, and email templates in secrets storage with synced `.env.example` documentation (Principles: operations, simplicity). Verified by documentation review and successful bootstrap on a clean machine.
- **FR-109**: Auth flows MUST emit structured logging or analytics events for sign-in, sign-up, and sign-out outcomes to aid debugging and future metrics (Principles: observability, quality). Verified by inspecting log output during automated tests and ensuring PII-free payloads.
- **FR-110**: Automated tests (unit, integration, and Playwright smoke) MUST cover successful auth, error states, session persistence, and authorization failures (Principles: testing, quality). Verified by CI pipeline runs gating merges on coverage thresholds.

### Key Entities *(include if feature involves data)*

- **Auth Session**: Represents the Supabase-issued access and refresh tokens plus expiry metadata required to authorize user interactions across frontend and backend surfaces.
- **User Account**: Captures the email identity, password status, and verification flags used to enforce authentication and profile-driven experiences.
- **Access Policy**: Encapsulates the Supabase RLS rules mapping authenticated users or service roles to the data operations they may perform.
- **Supabase Configuration**: Defines environment-specific variables (API keys, redirect URIs, email template identifiers) and documented procedures to reproduce them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-AUTH**: 95% of sign-up and sign-in attempts complete successfully under automated Playwright coverage, with error cases mapping to documented copy and no unhandled rejections.
- **SC-PASS**: Automated validation rejects 100% of passwords missing length or required character categories while allowing ≥99% of compliant submissions on first attempt.
- **SC-SESSION**: Authenticated sessions persist across at least three browser reloads and 30 minutes of inactivity during automated testing without forced reauthentication.
- **SC-VERIFY**: 100% of automated tests confirm that unverified accounts are blocked from protected routes and redirected to the verification screen until Supabase reports `email_confirmed_at` set.
- **SC-RLS**: RLS enforcement blocks 100% of cross-tenant data access attempts in automated Supabase policy tests, and backend responses stay within <250 ms for authorized queries.
- **SC-OPS**: New contributors configure Supabase locally using the documented checklist in under 20 minutes, and CI pipelines reuse the same secrets without manual overrides across two consecutive deployments.

## Assumptions

- Supabase project resources (auth, database, email provider) are provisioned and available to the team with sufficient quotas for development and testing.
- Email delivery via Supabase-managed SMTP or custom provider is reliable enough for verification flows, with local development allowed to bypass the protected-route gate only via a documented override when necessary.
- Future OAuth or SSO providers will reuse the foundational auth plumbing introduced here, so abstractions favor extension without premature generalization.
- Existing frontend and backend architecture is compatible with introducing Supabase clients, middleware, and FastAPI dependencies without major refactors.
