# Design System Onboarding

Welcome to the shared design system workspace for `@blockbuilders/frontend`. This directory houses the token-powered UI primitives, Storybook documentation, and onboarding resources for new contributors.

## Directory Layout
- `./` – Component entry points (Button, Input, Select, Modal, Toast) and shared utilities.
- `stories/` – CSF/MDX stories that document tokens and components across light/dark themes.
- `../lib/design-system/` – Typed token schema (`tokens.ts`) and helpers exported to consuming apps.
- `../scripts/` – Build tooling (e.g., `build-tokens.ts`) that emits CSS variables and Tailwind extensions.
- `../../styles/` – Generated `tokens.css` stylesheet that hydrates CSS variables at runtime.

## Token Workflow
1. Define or update tokens in `apps/frontend/lib/design-system/tokens.ts`.
2. Run the build script to emit CSS variables and keep Tailwind in sync:
   - `pnpm --filter @blockbuilders/frontend... run tokens:build`
3. Verify Storybook picks up the new tokens by starting the dev server:
   - `pnpm --filter @blockbuilders/frontend... run storybook`
4. Confirm the Tailwind theme reflects the tokens (`apps/frontend/tailwind.config.ts`) and no linting issues remain (`pnpm lint --max-warnings 0`).

## Component Contribution Checklist
- Reference tokens via semantic Tailwind classes or CSS variables (`var(--token-name)`).
- Keep stories accessible: test keyboard flows and run `pnpm --filter @blockbuilders/frontend... run storybook:test`.
- Update relevant specs under `specs/003-design-system-tokens/checklists/` when manual reviews (performance, accessibility, visual parity) are completed.
- Document any new command or workflow additions in this README and the feature quickstart (`specs/003-design-system-tokens/quickstart.md`).
