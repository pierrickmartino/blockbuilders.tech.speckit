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

The shared script `shared/scripts/collect-build-metadata.sh` emits a JSON object
with `version`, `commit`, and `timestamp` fields. It reads `APP_VERSION` first
before inspecting manifest files, ensuring CI can inject predictable values
without git metadata.

## Frontend Variables (`apps/frontend`)

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_ENV` | Yes | `local` | Mirrors the shared variable above. It MUST be present in `.env.local` so the Next.js runtime exposes the value to server and client components. |

The frontend `.env.example` file (created in Phase 3) documents exported
variables and clarifies that any `NEXT_PUBLIC_*` value becomes publicly visible
in the rendered HTML. Avoid storing secrets in these variables.

## Backend Variables (`apps/backend`)

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| `SERVICE_PORT` | No | `8000` | Overrides the port the FastAPI service binds to. Used by local dev servers and Docker Compose to coordinate networking. |

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
trustworthy.
