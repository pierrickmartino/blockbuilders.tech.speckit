# Supabase Configuration (Hosted Project)

Use this checklist to configure a hosted Supabase project (no local stack) and keep app/CI secrets in sync.

## Required Environment Variables
- **Frontend (`apps/frontend/.env.local`)**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_ENV`, optional `SUPABASE_URL` override.
- **Backend (`apps/backend/.env`)**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_ISSUER` (`https://<project>.supabase.co/auth/v1`), `SUPABASE_JWT_AUDIENCE` (default `authenticated`), `SUPABASE_JWKS_PATH` or `SUPABASE_JWKS_URL`, `SUPABASE_JWT_CACHE_TTL` (seconds, default `900`), `SUPABASE_REDIRECT_URLS` (comma list), optional `SUPABASE_EMAIL_TEMPLATE_VERIFY`.
- **CI / deployments**: copy `configs/ci/supabase.env.tpl` to a secrets file and fill every key; use it with the sync script below.

## Supabase Dashboard Setup
1) **Auth settings**
   - Enable **email confirmation** and enforce **12+ char password** with upper/lower/number/symbol.
   - Register redirect URLs for every environment (e.g., `http://localhost:3000/auth/callback`, staging, production domains) to match `SUPABASE_REDIRECT_URLS`.
   - Configure SMTP or Supabase email templates; record the verification template id in `SUPABASE_EMAIL_TEMPLATE_VERIFY`.
   - Keep RLS default **deny**; policies are applied via migrations—do not relax defaults in UI.
2) **API keys**
   - Copy the **anon** and **service-role** keys; store anon in frontend env, service-role only in backend/CI secrets.
3) **Database extensions**
   - For OHLCV, enable **TimescaleDB** in SQL editor: `create extension if not exists timescaledb;` (hosted projects have it available).
4) **Storage / buckets**
   - Create bucket `onboarding-disclosures` (or value in `NEXT_PUBLIC_ONBOARDING_DISCLOSURE_BUCKET`) for checklist disclosure copy.

## Migrations, Seeds, Feature Flags
- Apply SQL migrations from `shared/supabase/migrations` (or feature-specific SQL under `shared/supabase/rpc/`) using the Supabase SQL editor or `supabase db push` pointed at the hosted project.
- Seed onboarding data and feature flags against the hosted project:
  ```bash
  SUPABASE_URL=https://<project>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<service-role> \
  pnpm exec tsx scripts/seed-onboarding.ts --bootstrap --workspace <workspace-uuid>
  ```
  - Flags only: add `--flags-only` to upsert `onboarding_checklist_v1` and `onboarding_templates_alpha` in `feature_flags`.
  - The seed also writes starter templates (`shared/supabase/seed/*`) and will error if required disclosure metadata is missing.
- Ensure user profiles carry a workspace id (`raw_user_meta_data.workspace_id`); update via Dashboard → Auth → Users if needed for testing.

## Secret Sync Automation
- Validate parity between template and example env files: `./configs/scripts/sync_supabase_secrets.sh --check`.
- Push populated secrets file to Vercel/GitHub: `./configs/scripts/sync_supabase_secrets.sh --from-file ./secrets/supabase.env --target <environment> [--dry-run]`.
- Logs are saved to `configs/scripts/logs/supabase-sync-*.log`; attach recent runs to release readiness evidence.

## Operational Tips
- Rotate anon/service-role keys together; update `.env`, rerun the sync script, and restart backend to clear JWKS cache (cache TTL controlled by `SUPABASE_JWT_CACHE_TTL`).
- Keep `SUPABASE_REDIRECT_URLS` in env synchronized with Dashboard auth redirect origins to avoid 400s on login.
- When browsers block third-party cookies during testing, switch the client to in-memory storage via `setBrowserSupabaseStorageMode('memory')`; restore with `'cookies'`.
