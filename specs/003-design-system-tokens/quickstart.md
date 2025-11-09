# Quickstart

## Prerequisites
- Node.js 20.19+ and pnpm (per repo toolchain)
- uv (for backend tasks, required by repo setup script)
- Storybook 10 telemetry opt-in handled by environment (`STORYBOOK_DISABLE_TELEMETRY=1`)

## Environment Setup
1. Install dependencies: `pnpm install && uv sync`
2. Generate shadcn components (first-time only): `pnpm --filter @blockbuilders/frontend... exec shadcn init`
3. Sync shared tokens to CSS variables: `pnpm --filter @blockbuilders/frontend... run tokens:build`

## Working with Tokens
- Edit token definitions in `apps/frontend/lib/design-system/tokens.ts`
- Run `pnpm --filter @blockbuilders/frontend... run tokens:build` to emit `apps/frontend/styles/tokens.css`
- Tailwind picks up changes automatically via `tailwind.config.ts` hot reload

## Storybook Workflow
1. Start Storybook locally: `pnpm --filter @blockbuilders/frontend... run storybook`
2. Token stories live under `Design System / Tokens`; component stories under `Design System / Components`
3. Accessibility addon highlights WCAG violations; check the "Accessibility" panel before marking stories ready
4. Run automated checks in CI parity: `pnpm --filter @blockbuilders/frontend... run storybook:test`

## Testing
- Unit tests (Vitest): `pnpm --filter @blockbuilders/frontend... test`
- Coverage: `pnpm --filter @blockbuilders/frontend... test:coverage`
- Keyboard + a11y smoke tests (Playwright + axe): `pnpm --filter @blockbuilders/frontend... test:e2e --project=design-system`
- Lint/type-check: `pnpm lint --max-warnings 0` and `pnpm type-check`

## Adding a New Component
1. Scaffold via shadcn (`pnpm --filter @blockbuilders/frontend... exec shadcn add <component>`)
2. Replace default CSS classes with token-driven classes using `cn` helper and Tailwind theme extensions
3. Document props and states in Storybook with MDX guidelines referencing the relevant tokens
4. Extend Playwright spec to cover keyboard and a11y scenarios
5. Update `tests/design-system` Vitest suites to assert token usage contracts

## Theme Preference
- Theme provider auto-reads `prefers-color-scheme`; use the UI toggle to persist overrides
- Stored preferences flow through `/users/me/theme-preference`; ensure Supabase session includes the JWT when testing manually
