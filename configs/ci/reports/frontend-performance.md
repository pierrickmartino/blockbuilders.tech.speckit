# Frontend Performance Evidence

Artifacts demonstrating that the landing page meets performance budgets (TTI ≤ 2s, LCP ≤ 2.5s).

## Next.js Build Metrics

Collected via `pnpm --filter ./apps/frontend... build` (Next.js 15 production build). Update after significant UI or dependency changes.

| Metric | Value | Source File | Notes |
|--------|-------|-------------|-------|
| Build Duration | 1.74 s | Build CLI output | Total wall-clock time for full production build. |
| First Load JS | 102 kB | CLI output | Shared bundle size from Next.js build summary. |
| Largest Page (/) | 3.45 kB | CLI output | Static landing page payload. |

## Playwright Performance Trace

Recorded via `pnpm test:e2e -- --project=smoke --config apps/frontend/playwright.config.ts --reporter=line --trace=on`. A summary with LCP and TTI must stay within documented budgets.

| Measurement | Value | Evidence | Notes |
|-------------|-------|----------|-------|
| Time To Interactive (TTI) | n/a | — | Playwright trace unavailable; Chromium headless shell blocked by sandbox permissions. |
| Largest Contentful Paint (LCP) | n/a | — | Capture from CI traces once Playwright smoke executes on GitHub runners. |

## Update Procedure

1. Run the build and smoke tests locally or in CI with performance tracing enabled.
2. Export the Playwright trace (`playwright-report/trace.zip`) and review metrics in the trace viewer.
3. Update the tables above with the observed values, including timestamped notes if metrics regress or improve.
4. Commit both the updated metrics and any supporting artifacts (excluding large trace archives) to maintain auditable evidence.
