# Quickstart Guide — Initial Technical Skeleton

## Prerequisites

- Node.js 20.19+ (install via `fnm`, `nvm`, or Volta); pnpm 9.x globally (`corepack enable`)
- Python 3.12 with [`uv`](https://github.com/astral-sh/uv) (`pip install uv`)
- Docker Desktop (>= 4.33) or compatible runtime with Compose V2
- Git 2.44+, make, and Playwright dependencies (`npx playwright install --with-deps`)

## Repository Setup

```bash
git clone git@github.com:blockbuilders/mono.git
cd mono
pnpm install --frozen-lockfile         # installs frontend workspace deps
uv sync                                # creates backend virtual environment
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/backend/.env.example apps/backend/.env
```

Populate `.env` files with required variables:

- `NEXT_PUBLIC_APP_ENV` (`local`, `ci`, `staging`, `production`)
- `APP_VERSION` (optional override; defaults to `package.json` version)
- `SERVICE_PORT` (backend; defaults to `8000`)

## Development Servers

### Frontend

```bash
pnpm dev --filter ./apps/frontend...     # Next.js dev server on http://localhost:3000
```

Landing page exposes build metadata via `data-app-*` attributes for smoke tests.

### Backend

```bash
uv run fastapi dev apps/backend/app/main.py --reload
# or
make dev-backend
```

The `/health` endpoint responds on `http://localhost:8000/health` with the contract defined in `contracts/backend.openapi.yaml`.

### Docker Compose (full stack)

```bash
docker compose -f configs/compose/docker-compose.dev.yml up --build
```

Services share the `app-network` network and load environment variables from `.env` files. Stop with `docker compose ... down`.

## Quality Gates

```bash
pnpm lint --filter ./apps/frontend...
pnpm type-check --filter ./apps/frontend...
pnpm test:coverage --filter ./apps/frontend...      # Vitest unit coverage ≥80%
pnpm test:e2e --filter ./apps/frontend... --project smoke  # Playwright smoke + accessibility

uv run ruff check apps/backend
uv run pytest --cov=app --cov-report=term-missing
```

Run all gates before opening a PR to satisfy Constitution Principle I.

## CI Parity

- GitHub Actions workflows live in `configs/ci/workflows/`. They run lint, test, coverage, build, and container scan jobs in parallel matrices.
- Docker images are built with cached layers and scanned via Docker Scout (fallback to Trivy).

## Troubleshooting

- **Node version errors**: Ensure `node --version` reports 20.19+; run `corepack enable pnpm`.
- **Playwright missing browsers**: Execute `pnpm test:e2e --filter ./apps/frontend... -- --install-deps`.
- **Backend env validation failures**: Check `apps/backend/.env` matches `BaseSettings` schema described in `research.md`.
- **Docker build cache misses**: Verify `COMPOSE_PROJECT_NAME` is consistent and pruning has not removed named volumes (`docker volume ls`).
