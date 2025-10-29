/speckit.constitution 
Create principles focused on code quality, simplicity (KISS - Keep It Simple, Stupid / YAGNI - You Aren't Gonna Need It), testing standards, user experience consistency, and performance requirements. 
Include governance for how these principles should guide technical decisions and implementation choices. 
Use standard and best-practices for NextJS 15, React 19, TailwindCSS, Python.


/speckit.specify

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