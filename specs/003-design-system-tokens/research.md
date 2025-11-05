# Research Notes

### Token Schema & Generation
- Decision: Define tokens in `apps/frontend/lib/design-system/tokens.ts` as typed maps (color, typography, spacing, radii) and emit CSS variables via a build script that writes to `apps/frontend/styles/tokens.css`.
- Rationale: Keeps a single TypeScript source of truth that can power Tailwind theme extensions, Storybook docs, and runtime CSS variables without duplicating values.
- Alternatives considered: Maintaining raw JSON with manual imports (higher drift risk), or relying solely on Tailwind config values (no strongly typed exports for components).

### Tailwind Integration
- Decision: Load the token maps inside `tailwind.config.ts`, extend `theme` with semantic aliases, and register a plugin that injects CSS variables with `addBase`.
- Rationale: Allows Tailwind utility classes and shadcn component styles to stay aligned with tokens while supporting runtime theme toggles.
- Alternatives considered: Hard-coding theme values inside Tailwind (blocks dynamic theming) or using arbitrary values per component (breaks consistency).

### shadcn/ui Theming
- Decision: Scaffold shadcn components and refactor their style tokens to reference the generated CSS variables, exposing variant props for stateful styles (focus, destructive, ghost, etc.).
- Rationale: Leverages accessible Radix primitives while guaranteeing that component states consume the canonical tokens.
- Alternatives considered: Building components from scratch with Radix (slower, duplicates shadcn work) or adopting another UI kit like Chakra (diverges from mandated stack).

### Storybook Accessibility Coverage
- Decision: Configure Storybook 8 with `@storybook/addon-a11y`, auto-generate token stories, and run `pnpm --filter @blockbuilders/frontend... storybook:test` in CI to execute axe-powered audits.
- Rationale: Provides automated evidence for AC1 while keeping token/component docs in a single workspace.
- Alternatives considered: Manual a11y review only (non-repeatable) or switching to Ladle (would add unsupported tooling).

### Keyboard-Only Verification
- Decision: Write Playwright specs that mount each foundation component via Storybook URLs, simulate keyboard navigation, and assert focus ring/ARIA announcements alongside screenshot diffs.
- Rationale: Aligns with AC2 and constitution requirements for keyboard walkthrough evidence within existing Playwright stack.
- Alternatives considered: Limiting checks to Vitest + Testing Library (misses browser-level focus traps) or trusting manual QA passes.

### Dark Mode & Preference Sync
- Decision: Implement a theme provider that reads `prefers-color-scheme`, syncs with a user toggle stored in Supabase session data, and maps tokens to `:root[data-theme]`.
- Rationale: Guarantees parity between default and dark themes, supports SSR, and honors edge-case fallback rules from the spec.
- Alternatives considered: CSS-only `@media` toggles (no user override) or storing theme in local storage without SSR support.

### Supabase Auth Compatibility
- Decision: Keep design system components presentation-only, ensure they consume auth context via existing hooks without adding awaitable side effects, and run Supabase smoke tests post-integration.
- Rationale: Avoids coupling UI primitives to auth logic while confirming no regressions to existing Supabase flows.
- Alternatives considered: Creating new auth-aware wrappers (would duplicate existing layouts) or skipping Supabase verification (risking regressions).
