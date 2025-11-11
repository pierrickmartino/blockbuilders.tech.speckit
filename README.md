# Blockbuilders Mono-Repo Skeleton

Mono-repo baseline housing a Next.js 15 frontend and FastAPI backend with shared tooling, automated tests, and container orchestration.

## Stack

- **Frontend**: Next.js 15 (React 19), Tailwind CSS, Vitest, Playwright
- **Backend**: FastAPI, Pydantic v2, pytest, Ruff
- **Tooling**: pnpm 10, uv, Docker Compose, GitHub Actions

## Prerequisites

Follow the detailed [quickstart guide](specs/001-bootstrap-monorepo/quickstart.md) to install Node.js 20.19+, pnpm, Python 3.12, uv, and Docker. Then bootstrap dependencies:

```bash
pnpm install
uv sync --directory apps/backend
```

Copy the example environment files:

```bash
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/backend/.env.example apps/backend/.env
```

## Common Commands

| Task | Command |
|------|---------|
| Frontend dev server | `pnpm dev` |
| Backend dev server | `pnpm dev:backend` |
| Lint both services | `pnpm lint` or `make lint` |
| Type-check frontend | `pnpm type-check` |
| Run unit tests | `pnpm test` |
| Playwright smoke tests | `pnpm test:e2e` |
| Docker Compose stack | `make compose-up` / `make compose-down` |

See the [`Makefile`](Makefile) for additional shortcuts.

## Continuous Integration

| Workflow | File | Purpose |
|----------|------|---------|
| `Continuous Integration` | `configs/ci/workflows/ci.yml` | Lints, type-checks, and tests both services with cached pnpm/uv environments. Uploads Playwright reports on failure. |
| `Containers` | `configs/ci/workflows/containers.yml` | Builds development Docker images for frontend and backend, then scans them for critical/high vulnerabilities. |

## Docker & Local Orchestration

The dev stack is defined in [`configs/compose/docker-compose.dev.yml`](configs/compose/docker-compose.dev.yml). It builds service images with cache mounts and exposes ports:

- http://localhost:3000 → Next.js app (`frontend`)
- http://localhost:8000/health → FastAPI health endpoint (`backend`)

Health checks gate inter-service dependencies, and named volumes cache pnpm and uv assets for quicker rebuilds.

Bring the stack up or down from the repo root:

```bash
make compose-up
make compose-down
```

## Evidence & Reporting

Performance, latency, and startup evidence referenced by CI and docs lives under `configs/ci/reports/`:

- [`test-metrics.md`](configs/ci/reports/test-metrics.md) – Aggregated lint/test durations and `/health` latency samples (SC-TEST & SC-OPS).
- [`frontend-performance.md`](configs/ci/reports/frontend-performance.md) – Next.js build metrics and Playwright performance trace notes.
- [`container-start-times.md`](configs/ci/reports/container-start-times.md) – Cold-start timings for frontend and backend containers.

Additional troubleshooting, quickstart, and release guidance are captured in `docs/` during Phase 6.
