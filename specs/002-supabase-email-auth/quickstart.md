# Quickstart — Supabase Email Auth Integration

## Prerequisites
- Node.js 20 LTS with `pnpm` installed.
- Python 3.12 with `uv` installed.
- Supabase project with email auth enabled and custom SMTP verified (for production).
- Access to project secrets (anon key, service role key, JWT settings, email template IDs).

## Environment Setup
1. Copy `.env.example` to `.env` at the repository root and populate:
   - `NEXT_PUBLIC_SUPABASE_URL` — found in Supabase project settings.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon public key.
   - `SUPABASE_URL` — same as public URL but consumed server-side.
   - `SUPABASE_SERVICE_ROLE_KEY` — keep private; used by FastAPI and migrations.
   - `SUPABASE_JWT_AUDIENCE` — usually `authenticated`.
   - `SUPABASE_JWT_ISSUER` — `https://<project>.supabase.co/auth/v1`.
   - `SUPABASE_JWT_CACHE_TTL` — optional override (default 15 minutes).
   - `SUPABASE_EMAIL_VERIFY_TEMPLATE_ID` — optional custom template reference.
   - `NEXTAUTH_URL` (if required) and any redirect origins for local/preview/prod.
2. Run `pnpm install` from repository root to install workspace dependencies.
3. Run `uv sync` inside `apps/backend` to install FastAPI dependencies.
4. In Supabase dashboard:
   - Enable email confirmation and enforce the 12-character complexity policy.
   - Register redirect URLs for `http://localhost:3000/auth/callback` and production domains.
   - Customize verification emails or record template IDs for documentation.
   - Confirm RLS policies default to deny and create placeholders for upcoming secured tables.

## Local Development
### Frontend (Next.js 15)
```bash
cd apps/frontend
pnpm dev
```
- Sign-up and sign-in pages live under `/auth/sign-up` and `/auth/sign-in`.
- Protected routes should redirect to `/auth/verify` until `email_confirmed_at` exists.
- Middleware automatically reads Supabase cookies; use Chrome's Application tab to inspect httpOnly flags.

### Backend (FastAPI)
```bash
cd apps/backend
uv run uvicorn app.main:app --reload
```
- The `/me` endpoint validates Supabase JWTs; call with `Authorization: Bearer <access_token>`.
- Observe logs for JWKS cache hits/misses and 401 responses on invalid tokens.

## Testing
1. **Unit & Integration**:
   - Frontend: `cd apps/frontend && pnpm test` (Vitest) then `pnpm test:coverage`.
   - Backend: `cd apps/backend && uv run pytest`.
2. **Linting & Type Checks**:
   - Frontend: `pnpm lint --max-warnings 0`, `pnpm type-check`.
   - Backend: `uv run ruff check .`.
3. **End-to-End**:
   - Start both services, seed a test user (or leverage Supabase CLI), then run `cd apps/frontend && pnpm test:e2e`.
   - Playwright scripts cover sign-up, sign-in, verify flow, session persistence, and protected-route redirects.
4. **Accessibility**:
   - `pnpm test:e2e` includes `@axe-core/playwright` assertions; inspect reports under `apps/frontend/playwright-report`.

## Deployment Notes
- Ensure production secrets are stored in the deployment platform (e.g., Vercel, Render) matching `.env.example`.
- Rotate Supabase keys periodically; update secrets, redeploy backend, and invalidate cached JWKS.
- Monitor Supabase auth logs and application telemetry for 401/403 spikes; treat as security incidents.
- Document any deviations from password policy or email gating as governance exceptions per the constitution.
