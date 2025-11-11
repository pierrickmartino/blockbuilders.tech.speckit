# Quickstart

## Prerequisites
- Node.js 20.19+ and pnpm (per repo toolchain)
- uv (for backend tasks, required by repo setup script)
- Storybook 10 telemetry opt-in handled by environment (`STORYBOOK_DISABLE_TELEMETRY=1`)

## Environment Setup
1. Install dependencies: `pnpm install && uv sync`
2. Generate shadcn components (first-time only): `pnpm --filter @blockbuilders/frontend... exec shadcn init`
3. Sync shared tokens to CSS variables: `pnpm --filter @blockbuilders/frontend... run tokens:build`

## Command Reference

### Tokens

| Action | Command | Notes |
| --- | --- | --- |
| Generate CSS variables | `pnpm --filter @blockbuilders/frontend... run tokens:build` | Writes `apps/frontend/styles/tokens.css` so Tailwind + Storybook stay aligned |
| Refresh tokens before CI | `pnpm --filter @blockbuilders/frontend... run tokens:build && pnpm --filter @blockbuilders/frontend... run storybook:test` | Mirrors the Storybook accessibility workflow locally |

### Components

| Action | Command | Notes |
| --- | --- | --- |
| Preview docs | `pnpm --filter @blockbuilders/frontend... run storybook` | Opens tokens + foundation component stories with the accessibility addon |
| Run Storybook a11y suite | `pnpm --filter @blockbuilders/frontend... run storybook:test` | Same checks executed in `.github/workflows/storybook-a11y.yml` |
| Execute component unit tests | `pnpm --filter @blockbuilders/frontend... test` | Vitest coverage for Button/Input/Select/Modal/Toast |
| Run keyboard/e2e flows | `pnpm --filter @blockbuilders/frontend... test:e2e --project=design-system` | Playwright specs for accessibility walkthroughs |

## Working with Tokens
- Edit token definitions in `apps/frontend/lib/design-system/tokens.ts`
- Run `pnpm --filter @blockbuilders/frontend... run tokens:build` to emit `apps/frontend/styles/tokens.css`
- Tailwind picks up changes automatically via `tailwind.config.ts` hot reload

## Storybook Workflow
1. Start Storybook locally: `pnpm --filter @blockbuilders/frontend... run storybook`
2. Token stories live under `Design System / Tokens`; component stories under `Design System / Components`
3. Accessibility addon highlights WCAG violations; check the "Accessibility" panel before marking stories ready
4. Run automated checks in CI parity: `pnpm --filter @blockbuilders/frontend... run storybook:test`
5. CI mirrors these commands via `.github/workflows/storybook-a11y.yml`; ensure local runs are green before pushing.

## Testing
- Unit tests (Vitest): `pnpm --filter @blockbuilders/frontend... test`
- Coverage: `pnpm --filter @blockbuilders/frontend... test:coverage`
- Keyboard + a11y smoke tests (Playwright + axe): `pnpm --filter @blockbuilders/frontend... test:e2e --project=design-system`
- Storybook accessibility checks: `pnpm --filter @blockbuilders/frontend... run storybook:test`
- Lint/type-check: `pnpm lint --max-warnings 0` and `pnpm type-check`

## CI Automation
- Storybook accessibility guardrail runs automatically via `.github/workflows/storybook-a11y.yml` on pushes/PRs to `main`.
- To troubleshoot before opening a PR, execute the same steps locally: `pnpm --filter @blockbuilders/frontend... run tokens:build` followed by `pnpm --filter @blockbuilders/frontend... run storybook:test`.

## Adding a New Component
1. Scaffold via shadcn (`pnpm --filter @blockbuilders/frontend... exec shadcn add <component>`)
2. Replace default CSS classes with token-driven classes using `cn` helper and Tailwind theme extensions
3. Document props and states in Storybook with MDX guidelines referencing the relevant tokens
4. Extend Playwright spec to cover keyboard and a11y scenarios
5. Update `tests/design-system` Vitest suites to assert token usage contracts

## Theme Preference
- Theme provider auto-reads `prefers-color-scheme`; use the UI toggle to persist overrides
- Stored preferences flow through `/users/me/theme-preference`; ensure Supabase session includes the JWT when testing manually
