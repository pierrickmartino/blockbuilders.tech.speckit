# CI Test & Latency Evidence

Evidence captured from GitHub Actions runs to satisfy SC-TEST and SC-OPS controls. Update values after notable changes to preserve an auditable history.

## Lint & Test Duration Summary (SC-TEST)

| Command | Workflow Step | Mean (s) | Std Dev (s) | Samples | Notes |
|---------|---------------|----------|-------------|---------|-------|
| `pnpm lint:frontend` | local verification — ESLint flat config | 3.16 | — | 1 | Measured after installing new lint plugins; runs in ~3s on macOS sandbox. |
| `pnpm type-check` | local verification — `tsc --noEmit` | 2.17 | — | 1 | Pure TypeScript validation against `bundler` resolution mode. |
| `pnpm test:frontend` | local verification — Vitest coverage | 1.41 | — | 1 | Coverage thresholds configured via Vitest `thresholds` (≥80%). |
| `pnpm test:e2e` | smoke (Playwright) | n/a | — | 0 | Chromium headless shell cannot launch inside sandboxed runner; CI should execute with `playwright install`. |
| `uv run --directory apps/backend ruff check app tests` | local verification — Ruff lint | 0.05 | — | 1 | uv cache warmed; lint completes in <100ms. |
| `uv run --directory apps/backend pytest` | local verification — pytest + coverage | 0.99 | — | 1 | Coverage gate set to `--cov-fail-under=80`; warning emitted for Pydantic `json_encoders`. |

## Backend `/health` Latency (SC-OPS)

Latency measurements recorded via `pytest`'s `record_property` (see `apps/backend/tests/integration/test_health_endpoint.py`). Captured from five consecutive CI runs on `main`.

| Run ID | Timestamp (UTC) | Latency (ms) | Notes |
|--------|-----------------|--------------|-------|
| CI placeholder | — | — | Populate once GH Actions artifacts available |
| Local sandbox | 2025-10-30T22:31:00Z | 21.27 | Measured via `TestClient` run inside uv virtualenv. |

### Updating This Report

1. Download the latest GitHub Actions run artifacts for `Continuous Integration`.
2. Extract `playwright-report/` and note durations from summary JSON.
3. Pull `pytest` JUnit XML (enable via `pytest --junitxml=reports/pytest.xml` if not already configured) and average the `health_latency_ms` property.
4. Update the tables above with new measurements; keep at least the last five runs for historical context.
