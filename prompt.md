# Global

## /speckit.constitution 

Create principles focused on code quality, simplicity (KISS - Keep It Simple, Stupid / YAGNI - You Aren't Gonna Need It), testing standards, user experience consistency, and performance requirements. 
Include governance for how these principles should guide technical decisions and implementation choices. 
Use standard and best-practices for NextJS 15, React 19, TailwindCSS, Python.

# Iteration 1

## /speckit.specify

Title: Initial technical skeleton (mono-repo)
Why: Establish fast iteration loop with tests & CI; no product features yet.

Scope:
- Frontend: Next.js 15 App Router + TypeScript + TailwindCSS; ESLint + Prettier; Vitest/Playwright smoke tests; basic "/" page with build info.
- Backend: FastAPI + Uvicorn; Pydantic v2; pytest; health endpoint GET /health returning {"status":"ok"}.
- Tooling: pnpm workspace for Frontend, uv or poetry for Backend; Dockerfiles for both; docker-compose for local dev; Makefile targets (dev, test, lint).
- CI: GitHub Actions for lint + test on push; build containers.
Non-Goals: No auth, no persistence beyond in-memory; no deployment.
Acceptance Criteria:
- `pnpm dev` runs Frontend at /; `uv run fastapi dev` (or `make dev`) serves Backend at /health.
- `pnpm test` and `pytest` green in CI.
- Repo READMEs document how to run locally.

## /speckit.clarify

## /speckit.plan

Stack decisions & architecture:
- Frontend: Next.js 15 + Tailwind; directory layout, env handling, base layout.tsx.
- Backend: FastAPI app factory pattern; routers folder; settings module; uvicorn config.
- Local orchestration: docker-compose with shared network; .env.example files.
- Testing strategy: Vitest + Playwright smoke; pytest for Backend; coverage thresholds.
- CI: GHA workflows matrix for Frontend/Backend.
Risks: version pinning, caching in CI, docker layer caching.

## /speckit.tasks
## /speckit.analyze
## /speckit.implement Phase 1

# Iteration 2

## Local Chat with Codex-Medium - Step 1

### Instruction

With the context of my blockbuilders.tech.speckit project, I want to implement an iteration in order to add email authentication thanks to Supabase with sign in / sign up page.
Please output what you would give to speckit.specify with the following format :

Title: xxxxx
Why: xxxxx

Scope:
- Frontend: xxxx
- Backend: xxxx
- Infra: xxxx

Acceptance Criteria:
AC1 : xxxx
AC2: xxx
AC3 : xxx

### Output

Title: Supabase Email Auth Integration
Why: Enable users to create and access personalized accounts securely, unlocking gated functionality and paving the way for future profile-driven features.

Scope:
- Frontend: Add dedicated sign-up/sign-in UI, handle Supabase auth flows, surface error/loading states, and persist user session across navigation.
- Backend: Configure Supabase email auth (redirect URLs, password settings), expose server-side session validation helpers, and ensure RLS policies allow authenticated reads/writes only where intended.
- Infra: Store Supabase keys/env vars in project secrets, document local env setup, and update deployment config to supply the same values.

Acceptance Criteria:
AC1: Users can create an account and sign in via Supabase email/password forms, with clear feedback for success and common failure states.
AC2: Authenticated users remain signed in across page reloads, can sign out, and protected routes redirect unauthenticated visitors to the auth page.
AC3: Supabase project configuration (auth settings, RLS policies, env vars) is documented and applied in all environments so deployments succeed without manual tweaks.

## Local Chat with Codex-Medium - Step 2

### Instruction

Transform the following bullet-point instructions into a written paragraph : 
Previous output

### Output

The “Supabase Email Auth Integration” initiative will let users create secure, personalized accounts that unlock gated functionality and set the stage for future profile-driven features. We will build dedicated sign-up and sign-in screens on the frontend that manage Supabase authentication flows, display clear loading and error states, and maintain sessions across navigation. On the backend, we will configure Supabase email authentication—including redirect URLs and password policies—while exposing helpers for server-side session validation and tightening RLS policies so authenticated actions happen only where intended. Infrastructure updates will store Supabase keys in project secrets, document the local environment setup, and align deployment configurations with those same values. Success means users can register and log in via email/password with consistent feedback, stay signed in through reloads, sign out cleanly, and see protected routes redirect unauthenticated visitors. It also requires documenting and applying the Supabase configuration (auth settings, RLS policies, environment variables) in every environment so deployments work without manual tweaks.

## /speckit.specify

The “Supabase Email Auth Integration” initiative will let users create secure, personalized accounts that unlock gated functionality and set the stage for future profile-driven features. We will build dedicated sign-up and sign-in screens on the frontend that manage Supabase authentication flows, display clear loading and error states, and maintain sessions across navigation. On the backend, we will configure Supabase email authentication—including redirect URLs and password policies—while exposing helpers for server-side session validation and tightening RLS policies so authenticated actions happen only where intended. Infrastructure updates will store Supabase keys in project secrets, document the local environment setup, and align deployment configurations with those same values. Success means users can register and log in via email/password with consistent feedback, stay signed in through reloads, sign out cleanly, and see protected routes redirect unauthenticated visitors. It also requires documenting and applying the Supabase configuration (auth settings, RLS policies, environment variables) in every environment so deployments work without manual tweaks. **DO NOT USE** prompt.md and iteration.md files. 

## /speckit.clarify

## /speckit.plan

- Frontend: Use Route Handlers for server actions that need session; set up Supabase client in server & client contexts; auth middleware.
- Backend: Add JWT verification dependency; cache JWKS; 401 on invalid; sample protected route /me.
- Testing: Mock Supabase in unit tests; Playwright e2e for login.
- Security: httpOnly cookies; CSRF considerations; .env.example updates.

## /speckit.tasks
## /speckit.analyze
## /speckit.implement Phase 1

