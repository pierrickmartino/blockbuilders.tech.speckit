# Troubleshooting Matrix

Use this matrix to diagnose common issues observed while working on the mono-repo services. Each entry links the symptom to quick checks and the recommended fix.

| Service | Symptom | What to Check | Resolution |
|---------|---------|---------------|------------|
| Frontend (Next.js) | `pnpm dev` fails with Node version warning | Run `node --version` and confirm it is 20.11+ | Align with repository Node version by running `nvm use` or reinstalling via fnm/Volta, then retry `pnpm install` |
| Frontend (Next.js) | Landing page missing `data-app-*` attributes | Inspect logs for env parsing errors; run `pnpm test:coverage --filter ./apps/frontend...` to surface schema violations | Copy `apps/frontend/.env.example` to `.env.local`, populate `NEXT_PUBLIC_APP_ENV`, and regenerate build metadata |
| Frontend (Playwright) | `pnpm test:e2e --filter ./apps/frontend...` fails citing missing browsers | Verify Playwright dependencies via `npx playwright install --with-deps` | Install the required browsers (`pnpm test:e2e ... -- --install-deps`) and rerun tests |
| Backend (FastAPI) | `uv run fastapi dev ...` exits due to env validation | Check `.env` against `apps/backend/app/core/settings.py` requirements | Copy `.env.example`, populate required vars (e.g., `SERVICE_PORT`), and restart the dev server |
| Backend (pytest) | `uv run pytest` reports coverage threshold failure | Ensure tests executed against latest code; confirm `uv sync` was run after dependency changes | Address failing tests, add coverage for new paths, and rerun `uv run pytest --cov=app --cov-report=term-missing` |
| Docker Compose | `docker compose ... up` fails on healthcheck timeout | Inspect container logs via `docker compose ... logs <service>` and confirm env files are mounted | Ensure `.env` files exist for both services, rebuild images with `docker compose -f configs/compose/docker-compose.dev.yml up --build` |
| CI Workflows | GitHub Actions job caches miss leading to slow pipelines | Confirm cache keys in `configs/ci/workflows/*.yml` match local lockfiles | Re-run workflow to warm caches; if lockfiles changed, commit updates so cache keys realign |
| Supabase | Auth requests fail immediately after rotating Supabase keys | Verify `SUPABASE_SERVICE_ROLE_KEY`, anon key, and JWT issuer in `.env` files and CI secrets. Confirm caches flushed by reviewing `SUPABASE_JWT_CACHE_TTL` and CDN TTL. | Run `configs/scripts/sync_supabase_secrets.sh` to push new values to Vercel/GitHub Actions, invalidate JWKS cache by restarting backend pods, and rerun smoke tests. |
| Supabase | Password reset or verification emails missing from inbox | Check Supabase dashboard SMTP settings, template identifiers, and `SUPABASE_EMAIL_TEMPLATE_VERIFY` in environment files. Review Supabase status page for incidents. | Trigger resend via Supabase dashboard or backend admin route, confirm template IDs match, and log actions in `docs/RELEASE_CHECKLIST.md` when incidents occur. |
