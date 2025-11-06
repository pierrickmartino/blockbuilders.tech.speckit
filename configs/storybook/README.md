# Storybook Workspace Overview

The design system stories live in a shared Storybook workspace rooted in `configs/storybook`. This workspace drives documentation, automated accessibility checks, and cross-team reviews for the `apps/frontend` Next.js application.

## Running Storybook Locally
- Install dependencies from the repository root with `pnpm install`.
- Start the Storybook dev server via `pnpm --filter @blockbuilders/frontend... run storybook`.
- Story groups:
  - **Design System / Tokens** – generated from the token schema and CSS variables.
  - **Design System / Components** – foundational components (Button, Input, Select, Modal, Toast).
- Environment variables:
  - `STORYBOOK_DISABLE_TELEMETRY=1` is already set in shared tooling.
  - `SUPABASE_URL` and `SUPABASE_ANON_KEY` are only required when previewing authenticated scenarios.

## Accessibility Workflows
- The workspace ships with `@storybook/addon-a11y` and renders the Accessibility panel by default.
- Treat all WCAG 2.2 AA violations reported by the addon as blocking issues.
- Use Storybook's theme toggle to verify light/dark parity before marking a story "Ready".
- When reviewing tokens, confirm the WCAG contrast ratios displayed in the panel match the token metadata in `apps/frontend/lib/design-system/tokens.ts`.

## Automated Testing
- **Storybook test runner**: `pnpm --filter @blockbuilders/frontend... run storybook:test`
  - Runs axe-powered audits in headless Chromium for every published story.
  - Fails the pipeline on accessibility regressions or console errors.
- **Playwright integrations**: `pnpm --filter @blockbuilders/frontend... test:e2e --project=design-system`
  - Exercises keyboard-only flows against Storybook URLs.
  - Captures traces for performance measurements required by specs.
- **Repository quality gates**: `pnpm lint --max-warnings 0`, `pnpm type-check`, and `pnpm test:coverage` must pass before merging Storybook updates.

## Adding New Stories
1. Author the component or token implementation in `apps/frontend`.
2. Create a CSF or MDX story under `apps/frontend/components/design-system/stories`.
3. Run the Storybook dev server and validate the story in both light and dark themes.
4. Execute `pnpm --filter @blockbuilders/frontend... run storybook:test` locally; address any axe or console violations.
5. Commit with links to performance or manual checklists stored under `specs/003-design-system-tokens/checklists`.
