# Blockbuilders Backend Service

FastAPI application exposing the `/health` contract consumed by CI, Docker Compose, and operational tooling.

## Prerequisites

- Python 3.12
- [`uv`](https://github.com/astral-sh/uv) for dependency management

From the repository root:

```bash
uv sync --directory apps/backend
```

## Development Server

```bash
uv run --directory apps/backend fastapi dev app/main.py --reload
# or leverage the entrypoint helper
uv run --directory apps/backend python -m app.main
```

The service listens on `http://localhost:8000/health` by default. Override host/port via environment variables in `.env`.

## Testing & Quality Gates

```bash
uv run --directory apps/backend pytest
uv run --directory apps/backend pytest --cov=app --cov-report=term-missing  # coverage enforcement
uv run --directory apps/backend ruff check app tests                        # lints (Phase 5)
```

Smoke test the deployed endpoint:

```bash
curl http://localhost:8000/health | jq
```

## Environment Configuration

Copy `.env.example` to `.env` and adjust as needed:

```env
APP_NAME=blockbuilders-backend
APP_VERSION=0.1.0-dev
SERVICE_HOST=0.0.0.0
SERVICE_PORT=8000
```

Environment variables are validated at startup—missing values log a structured error and surface `status="error"` (future hardening).
