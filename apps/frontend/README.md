# Frontend Workspace — Next.js 15 Skeleton

This package hosts the baseline App Router client that surfaces build metadata
for smoke tests and stakeholder demos.

## Commands

```bash
pnpm install                # at repository root
pnpm dev --filter apps/frontend...
pnpm lint --filter apps/frontend...
pnpm type-check --filter apps/frontend...
pnpm test:coverage --filter apps/frontend...
pnpm test:e2e --filter apps/frontend... --project smoke
```

All commands assume Node.js 20.11+ with `corepack enable` to expose pnpm 9.

## Environment

Copy `.env.example` to `.env.local` and fill in runtime variables:

```
NEXT_PUBLIC_APP_ENV=local   # local | ci | staging | production
```

Values are validated via `apps/frontend/lib/env.ts` and exposed publicly to the
rendered HTML. Avoid placing secrets in `NEXT_PUBLIC_*` variables.

## Build Metadata

The landing page renders the output of `shared/scripts/collect-build-metadata.sh`
and writes the snapshot to `data-app-*` attributes on `<body>`. When git details
are missing the UI falls back to friendly labels so Playwright smoke tests
continue to pass.

## Testing

- **Vitest** runs unit coverage with ≥80% thresholds defined in
  `apps/frontend/vitest.config.ts`.
- **Playwright** smoke suite lives in `tests/smoke`. The `smoke` project validates
  metadata attributes and performs accessibility checks using axe-core. A second
  `smoke-fallback` project sets `PLAYWRIGHT_EXPECT_UNKNOWN_COMMIT=1` to assert the
  default labels rendered when git metadata is unavailable.

Run both suites before opening a pull request to satisfy the constitution’s
testing principle.
