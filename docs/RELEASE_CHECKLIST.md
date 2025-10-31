# Release Readiness Checklist

Run through every item before tagging a release. Capture links to CI runs or artifacts for future audits.

## Repository Hygiene

- [ ] All Phase 6 documentation updated (`docs/TROUBLESHOOTING.md`, `docs/QUICKSTART.md`) with latest data
- [ ] CHANGELOG or release notes drafted and reviewed
- [ ] No uncommitted changes (`git status` clean)

## Frontend Verification

- [ ] `pnpm lint --filter apps/frontend...` succeeds
- [ ] `pnpm type-check --filter apps/frontend...` succeeds
- [ ] `pnpm test:coverage --filter apps/frontend...` meets ≥80% thresholds
- [ ] `pnpm test:e2e --filter apps/frontend... --project smoke` passes and Playwright trace archived
- [ ] Performance report (`configs/ci/reports/frontend-performance.md`) updated with latest build/trace metrics

## Backend Verification

- [ ] `uv run ruff check apps/backend` passes
- [ ] `uv run pytest --cov=app --cov-report=term-missing` meets ≥80% thresholds
- [ ] `/health` latency table in `configs/ci/reports/test-metrics.md` refreshed with most recent CI run

## Containers & Automation

- [ ] `docker compose -f configs/compose/docker-compose.dev.yml up --build` completes without failing health check
- [ ] GitHub Actions `CI` workflow green on target commit
- [ ] GitHub Actions `Containers` workflow green on target commit
- [ ] `configs/ci/reports/container-start-times.md` updated with latest timings or annotated as pending

## Security & Compliance

- [ ] Container scan (Docker Scout or Trivy) passes with no blocking CVEs
- [ ] Dependency audits reviewed (`pnpm audit`, `uv pip audit` optional)
- [ ] Access credentials rotated or validated per policy

Record the date, operator, and supporting CI run URLs once every box is checked.
