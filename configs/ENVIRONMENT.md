# Environment Variable Contract

This document defines the cross-service environment surface for the mono-repo
so each app, container, and automation workflow reads consistent configuration.
Variables are grouped into shared settings consumed by multiple services and
service-specific settings that live alongside the relevant `.env` example file.

## Shared Variables

| Name | Required | Default | Description | Consumers |
|------|----------|---------|-------------|-----------|
| `APP_VERSION` | No | Derived from `package.json` version or `0.1.0-dev` | Optional override injected by CI when tagging releases. When unset, the metadata script infers version from the nearest manifest. | Frontend build metadata helper, backend health payload, Docker images |
| `NEXT_PUBLIC_APP_ENV` | Yes | `local` | Environment label exposed to the frontend and surfaced in build metadata. Must be one of `local`, `ci`, `staging`, or `production`. | Frontend runtime config, Playwright smoke tests, quickstart |

## Supabase Authentication

| Name | Required | Default | Description | Consumers |
|------|----------|---------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | — | Public Supabase project URL used by the browser client. Matches the value shown in the Supabase dashboard. | Frontend Supabase browser client, middleware |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | — | Public anonymous key issued by Supabase. Required for browser sessions; keep in sync across environments. | Frontend Supabase browser client, Playwright fixtures |
| `SUPABASE_URL` | Yes (backend), optional (frontend) | Falls back to `NEXT_PUBLIC_SUPABASE_URL` | Canonical Supabase URL for server-side calls. Supply even in frontend `.env` files when server components run outside Next.js Edge defaults. | Frontend server helpers, backend JWKS validator |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Service role key with elevated Supabase privileges. Store only in secure contexts (backend, CI secrets). | Backend FastAPI settings, secret sync scripts |
| `SUPABASE_JWT_AUDIENCE` | No | `authenticated` | Expected JWT `aud` claim; override when Supabase project uses custom audiences. | Backend JWT verification |
| `SUPABASE_JWT_ISSUER` | Yes | — | Expected JWT `iss` claim, usually `https://<project>.supabase.co/auth/v1`. | Backend JWT verification, documentation |
| `SUPABASE_JWKS_URL` | No | Derived from `SUPABASE_URL` + `SUPABASE_JWKS_PATH` | Optional override for the JWKS endpoint. Use when Supabase exposes keys behind a proxy. | Backend JWKS fetcher |
| `SUPABASE_JWKS_PATH` | No | `/auth/v1/jwks` | Path appended to `SUPABASE_URL` to build the JWKS URL when `SUPABASE_JWKS_URL` is unset. | Backend JWKS fetcher |
| `SUPABASE_JWT_CACHE_TTL` | No | `900` | TTL in seconds for cached JWKS responses (`15` minutes by default). | Backend JWKS cache |
| `SUPABASE_REDIRECT_URLS` | Yes | — | Comma-separated list of allowed auth redirect origins (local, staging, production). Must match Supabase dashboard settings. | Supabase secret sync script, documentation |
| `SUPABASE_EMAIL_TEMPLATE_VERIFY` | No | — | Email template identifier for verification emails. Document when custom templates are configured. | Documentation, support runbooks |

The shared script `shared/scripts/collect-build-metadata.sh` emits a JSON object
with `version`, `commit`, and `timestamp` fields. It reads `APP_VERSION` first
before inspecting manifest files, ensuring CI can inject predictable values
without git metadata.

## Frontend Variables (`apps/frontend`)

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_ENV` | Yes | `local` | Mirrors the shared variable above. It MUST be present in `.env.local` so the Next.js runtime exposes the value to server and client components. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | — | Public Supabase endpoint surfaced in the Supabase dashboard. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | — | Anonymous Supabase key used by the browser. Treat as public but rotate alongside other Supabase credentials. |
| `SUPABASE_URL` | No | `NEXT_PUBLIC_SUPABASE_URL` | Optional server-side override when backend calls must target a different Supabase domain (e.g., self-hosted gateways). |

The frontend `.env.example` file documents exported variables and clarifies that
any `NEXT_PUBLIC_*` value becomes publicly visible in the rendered HTML. Avoid
storing secrets in these variables and verify redirect origins are registered in
the Supabase dashboard.

## Backend Variables (`apps/backend`)

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `SERVICE_PORT` | No | `8000` | Overrides the port the FastAPI service binds to. Used by local dev servers and Docker Compose to coordinate networking. |
| `SUPABASE_URL` | Yes | — | Canonical Supabase URL used for JWT validation and admin operations. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | — | Supabase service role key with elevated privileges. NEVER expose to the frontend. |
| `SUPABASE_JWT_AUDIENCE` | No | `authenticated` | Expected audience claim when validating Supabase-issued tokens. |
| `SUPABASE_JWT_ISSUER` | Yes | — | Expected issuer claim; Supabase typically reports `https://<project>.supabase.co/auth/v1`. |
| `SUPABASE_JWKS_URL` | No | Derived | Optional override when JWKS lives behind a proxy. |
| `SUPABASE_JWKS_PATH` | No | `/auth/v1/jwks` | Path appended to `SUPABASE_URL` when building the JWKS URL. |
| `SUPABASE_JWT_CACHE_TTL` | No | `900` | Cache duration (seconds) for JWKS responses. Lower during rotation drills. |
| `SUPABASE_REDIRECT_URLS` | Yes | — | Comma-separated redirect origins that must align with Supabase auth settings. |
| `SUPABASE_EMAIL_TEMPLATE_VERIFY` | No | — | Identifier for the email verification template when custom SMTP is configured. |

Future backend settings (e.g., log level, external service credentials) will be
added here as they are introduced. The backend settings loader implemented later
in Phase 4 validates these values using Pydantic models to ensure CI and local
environments fail fast when misconfigured.

## File Locations and Ownership

- Frontend variables live in `apps/frontend/.env.local` (example: `.env.example`)
  and are loaded via the Next.js runtime. Owners: Frontend team.
- Backend variables live in `apps/backend/.env` (example: `.env.example`) and
  are loaded by `apps/backend/app/core/settings.py`. Owners: Platform team.
- Shared scripts and CI pipelines read environment variables from the root
  `.env` files or Compose overrides defined in `configs/compose/`.

All `.env*` files are ignored via `.gitignore` and `.dockerignore`. Keep example
files up-to-date whenever new variables are added so onboarding remains
trustworthy, and rotate Supabase credentials through documented automation to
avoid manual drift.
