# Data Model

## Build Snapshot

- **Purpose**: Surface build provenance on the frontend landing page and in automated smoke tests.
- **Fields**:
  - `version` (string): Semantic version or fallback `0.1.0-dev`. Required. Sourced from `package.json` or CI tag.
  - `commit` (string): Short git SHA. Required. Falls back to `unknown` if git metadata unavailable.
  - `environment` (string): Human-readable label (`local`, `ci`, `staging`). Required. Derived from env var `NEXT_PUBLIC_APP_ENV`.
  - `timestamp` (ISO 8601 string): Build time captured at build step. Required. Generated in build script to ensure reproducibility.
- **Validation Rules**:
  - Strings must be trimmed, non-empty, and ≤64 chars.
  - `environment` must match allowed enum `[local, ci, staging, production]` with default `local`.
  - When running in CI, `commit` MUST resolve from `GITHUB_SHA`; local dev may fallback safely.
- **State Transitions**:
  - Updated on each build or `pnpm dev` boot via metadata helper.
  - Frontend caches snapshot via server component; invalidated on redeploy or rebuild.

## Service Health Status

- **Purpose**: Communicate backend readiness to internal consumers and CI probes.
- **Fields**:
  - `status` (string enum): `ok` or `error`. Defaults to `ok` when dependencies satisfied.
  - `version` (string): Backend service version (mirrors pyproject or git SHA). Optional; included when available.
  - `timestamp` (ISO 8601 string): Response generation time for observability. Required.
  - `details` (object | null): Optional diagnostics (`message`, `checks` array) returned only on error.
- **Validation Rules**:
  - `status="ok"` MUST return HTTP 200 with empty `details`.
  - Error responses MUST set HTTP 503 and populate `details.message`.
  - Response bodies MUST serialize via Pydantic model to guarantee schema stability.
- **State Transitions**:
  - Default `ok` when app factory initializes without exceptions.
  - Shifts to `error` when dependency checks fail (e.g., env validation) or startup raises.

## Relationships

- Build Snapshot data is consumed by frontend only; backend can expose metadata via future `/meta` route but not required in this iteration.
- Health Status is produced by backend and consumed by smoke tests, docker-compose healthcheck, and CI workflows.
- Both entities share version/commit sources to maintain consistency between surfaces; quickstart documents how to regenerate metadata across services.
