# Data Model — Supabase Email Auth Integration

## Entity: Auth Session
- **Purpose**: Represents the Supabase-issued access/refresh tokens required for authenticated requests on both frontend and backend surfaces.
- **Fields**:
  - `access_token` (string, JWT) — short-lived token used for API requests; must validate against Supabase JWKS.
  - `refresh_token` (string) — long-lived token stored in httpOnly cookie for session renewal.
  - `expires_at` (UTC epoch) — numeric expiry timestamp used to trigger refresh operations.
  - `token_type` (enum: `bearer`) — Supabase GoTrue fixed type.
  - `user_id` (UUID) — Supabase user identifier; foreign key to **User Account**.
  - `aud` (string) — expected audience, defaults to `authenticated`; enforced in backend JWT check.
  - `email_confirmed` (boolean) — derived flag from `email_confirmed_at` to block protected routes until true.
- **Relationships**: Each Auth Session belongs to one **User Account**; a user can have multiple active sessions (e.g., across devices).
- **Validation Rules**:
  - `expires_at` must be in the future when issued; refresh flow runs when <5 minutes remain.
  - Tokens must be stored in Supabase-managed httpOnly cookies; no localStorage persistence allowed.
- **State Transitions**:
  - `pending` → `active` once Supabase returns a valid session and email confirmed.
  - `active` → `revalidate` when `expires_at` is near; Supabase refresh endpoint renews tokens.
  - `active` → `blocked` when `email_confirmed` is false; guards redirect to verification route.
  - Any state → `terminated` upon sign-out or JWT verification failure (invalid/expired/tempered).

## Entity: User Account
- **Purpose**: Captures identity and verification metadata for authenticated users.
- **Fields**:
  - `id` (UUID) — Supabase primary key.
  - `email` (string) — unique, case-insensitive, used for login; requires confirmation.
  - `password_hash` (string) — managed by Supabase GoTrue; never exposed to application.
  - `email_confirmed_at` (timestamp) — set when user verifies email; null blocks protected routes.
  - `created_at` / `updated_at` (timestamps) — lifecycle tracking.
  - `last_sign_in_at` (timestamp) — used for session analytics and access policy audits.
  - `app_metadata` (JSON) — Supabase-managed roles/audience data.
  - `user_metadata` (JSON) — extensible profile attributes for future iterations.
- **Relationships**: One-to-many with **Auth Session**; referenced by **Access Policy** for RLS checks.
- **Validation Rules**:
  - Password policy: minimum 12 characters, at least one uppercase, lowercase, number, and symbol.
  - Email uniqueness enforced at Supabase; UI must surface duplicate errors.
  - Email confirmation required before `email_confirmed_at` is non-null.
- **State Transitions**:
  - `invited` → `registered` when sign-up completes.
  - `registered` → `verified` when email confirmation link clicked.
  - `verified` → `suspended` if manually disabled via Supabase (out-of-scope but supported).

## Entity: Access Policy
- **Purpose**: Defines row-level security (RLS) rules that restrict database operations to authenticated principals.
- **Fields**:
  - `policy_name` (string) — identifier stored in Supabase SQL migrations.
  - `table` (string) — targeted table schema.
  - `condition` (SQL expression) — boolean predicate referencing `auth.uid()` or role checks.
  - `action` (enum) — `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
  - `role` (string) — Supabase role the policy applies to, typically `authenticated`.
- **Relationships**: Bound to Supabase tables; references **User Account** implicitly via `auth.uid()`.
- **Validation Rules**:
  - Must deny by default; policies explicitly allow permitted operations.
  - Protected tables must include `tenant_id` or `user_id` columns for policy checks.
- **State Transitions**:
  - Policy drafts stored in migrations → deployed → enforced in Supabase environments.

## Entity: Supabase Configuration
- **Purpose**: Centralizes environment secrets and operational settings shared by frontend and backend services.
- **Fields**:
  - `SUPABASE_URL` (string) — base URL for API calls (server-side only).
  - `NEXT_PUBLIC_SUPABASE_URL` (string) — public URL for frontend.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (string) — anonymous key for client initialization.
  - `SUPABASE_SERVICE_ROLE_KEY` (string) — service-role key restricted to secure contexts.
  - `SUPABASE_JWT_AUDIENCE` (string) — expected JWT audience (defaults to `authenticated`).
  - `SUPABASE_JWT_ISSUER` (string) — derived from Supabase project ID; used in JWT validation.
  - `SUPABASE_REDIRECT_URLS` (list) — allowed redirect origins (local, preview, production).
  - `SUPABASE_EMAIL_TEMPLATE_VERIFY` (string) — identifier for verification email template.
- **Relationships**: Consumed by both frontend (`createServerClient`/`createBrowserClient`) and backend JWKS validator; referenced in documentation and GitHub Actions secrets.
- **Validation Rules**:
  - Keys must be present in `.env.example` and validated during bootstrap scripts.
  - Service role key must never be exposed to frontend bundles.
- **State Transitions**:
  - `unset` → `configured` when bootstrap steps populate `.env`.
  - `configured` → `rotated` when Supabase keys change; quickstart documents rotation steps.
