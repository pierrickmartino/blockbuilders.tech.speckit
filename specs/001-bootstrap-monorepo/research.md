# Phase 0 Research

## Decisions

Decision: Standardize on Node.js 20 LTS for the Next.js workspace managed via pnpm  
Rationale: Next.js 15 and React 19 target Node 18+, but Node 20 LTS aligns with current Vercel defaults, includes the latest V8 features required by Turbopack, and remains supported by pnpm without additional flags. Pinning Node 20.11+ avoids cross-platform inconsistencies and simplifies Docker base images.  
Alternatives considered: Node 18 LTS (kept for long-term support but lacks some V8 optimizations and would require future upgrade), Node 22 (too new for stable CI tooling and increases risk of ecosystem incompatibilities).

Decision: Scaffold Next.js App Router with a global `app/layout.tsx` that wires Tailwind base styles and injects build metadata via server components  
Rationale: App Router is the recommended architecture for Next.js 15, enabling server components and streaming by default. A centralized layout ensures shared providers (theme, analytics placeholder) and global Tailwind styles while keeping pages minimal. Injecting build metadata at the layout level guarantees it is cached consistently and available to smoke tests.  
Alternatives considered: Pages Router (deprecated for new apps; lacks server component ergonomics), injecting metadata per page (risks divergence and duplicated logic).

Decision: Manage environment configuration with `.env.example` files per service and typed helpers (`apps/frontend/lib/env.ts`, `apps/backend/app/core/settings.py`)  
Rationale: Separate examples clarify required variables while keeping secrets out of VCS. Typed loaders (zod schema on frontend, Pydantic BaseSettings on backend) surface validation errors early and ease CI bootstrapping. Shared `.env` loading in docker-compose keeps parity between local and CI runs.  
Alternatives considered: Single repo-wide `.env.example` (harder to scope service-specific needs), ad-hoc `process.env` access or `os.getenv` usage (no validation, harder to debug failures).

Decision: Implement FastAPI using an application factory (`create_app()`) with routers packaged by domain and Uvicorn configuration module  
Rationale: Factory pattern keeps initialization deterministic, enables dependency injection for future services, and simplifies testing by instantiating isolated apps. Dedicated `app/api/routers/__init__.py` organizes versioned routes, while `app/core/config.py` centralizes settings. Uvicorn config module standardizes host/port/log level and is shared by CLI and Docker entrypoints.  
Alternatives considered: Single global FastAPI instance (less testable and complicates future configuration overrides), mounting routers directly in `main.py` (harder to scale when additional routers/services arrive).

Decision: Use Docker Compose with a shared user-defined network, build args for version pinning, and bind-mounted source for dev workflows  
Rationale: Compose ensures consistent local orchestration, enabling `frontend`, `backend`, and optional `playwright` services to communicate via stable hostnames. Build args enforce Node 20 and Python 3.12 base images, while caching layers (pnpm store, uv cache) are persisted via named volumes to accelerate rebuilds. Shared network mirrors production ingress expectations.  
Alternatives considered: Running services separately via npm/uv scripts (faster initial setup but diverges from containerized CI path), Kubernetes manifests (overkill for skeleton, slower feedback).

Decision: Enforce testing strategy with Vitest for unit coverage, Playwright smoke suite, and pytest with coverage thresholds at 80%+  
Rationale: Vitest provides Jest-compatible DX with fast TypeScript support. Playwright handles end-to-end smoke with cross-browser capability and accessibility checks. Pytest remains the de-facto FastAPI testing harness, and coverage thresholds satisfy constitution Principle III. Splitting smoke tests into a dedicated Playwright project keeps CI matrices efficient.  
Alternatives considered: Jest (heavier config under ESM), Cypress for smoke (requires additional services and licensing for parallelization), Nose/UnitTest for Python (less modern ecosystem support).

Decision: Configure GitHub Actions matrix workflows separating frontend and backend jobs with caching for pnpm, Playwright, uv, and Docker layers  
Rationale: Matrix jobs allow independent lint/test cycles while sharing a setup stage to populate caches. `actions/setup-node` with pnpm cache and `actions/setup-python` with uv cache shorten runtimes. Docker layer caching via `docker/build-push-action` and GitHub cache tokens mitigates rebuild costs. Explicit version pinning in workflows reduces flakiness and satisfies the identified risk.  
Alternatives considered: Single combined workflow (simpler but slower with intertwined failures), GitLab or other CI providers (not aligned with current tooling), skipping Docker builds in CI (violates acceptance criteria for container readiness).

Decision: Adopt Docker Scout (or Trivy fallback) scanning as part of container build pipeline to catch CVEs early  
Rationale: Principle I requires security scanning. Docker Scout integrates with GitHub Actions, understands multi-stage Dockerfiles, and supports caching. Including a fallback (Trivy) ensures coverage if licensing blocks Scout.  
Alternatives considered: Deferring security scans to later iterations (risks violating constitution), custom script with `grype` (requires more maintenance without added value).
