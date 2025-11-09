# Visual Parity Checklist (T040a)

| Component | Light Theme | Dark Theme | Evidence |
|-----------|-------------|------------|----------|
| Buttons (primary/secondary/ghost/destructive) | ✅ Tokens match catalog; focus ring visible @ 2px | ✅ Contrast holds, destructive stays AA compliant | Storybook `Design System/Components/Foundation` canvas + manual capture (`artifacts/storybook-static` build 2025-11-09) |
| Input + Select | ✅ Border + helper text legible, error token triggered via mock validation | ✅ Border/focus tokens adjust, helper/error text readable | Next.js `/design-system/components` page – manual keyboard walkthrough 2025-11-09 |
| Modal overlay | ✅ Scrim opacity 55% keeps background visible | ✅ Scrim deepens to 75% yet allows context | `/design-system/components` modal launch during manual review |
| Toast (success/error/info) | ✅ Announcements reuse surface tokens; dismiss affordance visible | ✅ Text/icon colors meet AA | ToastProvider smoke test triggered from playground |

- [X] Verified light + dark mode via Theme toolbar in Storybook and URL parameter `?theme=dark` in the Next.js playground.
- [X] Captured notes/screens per component in the design review doc attached to `artifacts/storybook-static` build 2025-11-09.
