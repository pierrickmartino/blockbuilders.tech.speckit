# Accessibility Walkthrough Checklist (T042)

| Scenario | Result | Notes |
|----------|--------|-------|
| Keyboard navigation through Buttons/Input/Select (light theme) | ✅ PASS | Tab order follows DOM order; focus ring uses `color.focus.ring`. Verified on `/design-system/components` (2025-11-09). |
| Modal focus trap & Escape handling (dark theme) | ✅ PASS | `Open feedback modal` → focus trapped between "Full name" input and "Submit feedback" button; Escape returns focus to launcher. |
| Toast live region announcements | ✅ PASS | `Send toast` button raises `role="status"` region with polite live updates; screen reader announces "Toast ready". |
| Select dropdown keyboard support | ✅ PASS | Native `<select>` honors arrow keys; `aria-invalid` flagged when error string provided. |
| Error messaging visibility | ✅ PASS | Input helper + error IDs referenced via `aria-describedby` with red tokens `color.state.error.border/content`. |

- [X] Tested with system forced dark mode via `/design-system/components?theme=dark`.
- [X] Confirmed `pnpm --filter @blockbuilders/frontend... test:e2e --project=design-system` (Playwright) covers modal/toast flows.
