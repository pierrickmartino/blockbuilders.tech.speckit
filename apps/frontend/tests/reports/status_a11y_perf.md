# Status Page A11y + Performance Evidence

- Generated: 2025-11-22
- Scope: `/status` page (10 assets, stale filter, vendor badge, auto-refresh)

## Accessibility
- Axe run: TODO (run `pnpm exec playwright test --project status` with axe helper if available)
- Keyboard: Tables are focusable, filter checkbox reachable via tab, refresh button focus-visible.

## Performance Budgets
- TTI target ≤ 2000ms, LCP ≤ 2500ms on reference device.
- Capture command: `pnpm exec playwright test --project status-perf --reporter=list`
- Trace output: `artifacts/status-webvitals-trace.zip`

## Notes
- Auto-refresh interval set to 30s (overridable via `NEXT_PUBLIC_STATUS_REFRESH_MS`).
- Vendor badge surfaces rate-limit or outage states; remediation export provides JSON snapshot for audits.
