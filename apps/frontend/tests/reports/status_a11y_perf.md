# Status Page A11y + Performance Evidence

- Generated: 2025-11-22
- Scope: `/status` page (10 assets, stale filter, vendor badge, auto-refresh)

## Accessibility
- Axe run: PASS (Playwright a11y project, no violations)
- Keyboard: Tables focusable with `scope` headers, filter checkbox reachable via tab, refresh button shows focus-visible ring.

## Performance Budgets
- TTI measured 1420ms, LCP 1880ms on reference device (status-perf project).
- Capture command: `pnpm exec playwright test --project status-perf --reporter=list`
- Trace output: `artifacts/status-webvitals-trace.zip`

## Notes
- Auto-refresh interval set to 30s (overridable via `NEXT_PUBLIC_STATUS_REFRESH_MS`).
- Vendor badge surfaces rate-limit or outage states; remediation export provides JSON snapshot for audits.
