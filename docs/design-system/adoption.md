# Design System Adoption Guidelines

## Purpose & Success Metrics
- **Goal**: Ensure every new UI surface ships with the shared tokens + foundation components so WCAG 2.2 AA compliance remains the default.
- **Launch Definition**: A squad may mark adoption "complete" when its surface uses the token-generated CSS variables, consumes the Button/Input/Select/Modal/Toast primitives, and captures keyboard + Storybook a11y evidence in the phase checklists.
- **Metrics**:
  - ≥90% of new UI commits reference `apps/frontend/components/design-system/*` exports.
  - Storybook accessibility workflow (`storybook-a11y.yml`) reports 0 critical issues for the squad's stories before merge.
  - Manual walkthrough logs appended to `specs/003-design-system-tokens/checklists/*.md` for both light and dark modes.

## Rollout Playbook
1. **Kickoff (Week 0)**
   - Review `specs/003-design-system-tokens/spec.md` + `plan.md` with design + QA.
   - Verify tooling: run `pnpm install`, `pnpm --filter @blockbuilders/frontend... run tokens:build`, and `pnpm --filter @blockbuilders/frontend... run storybook` to preview tokens/components.
2. **Token Alignment (Week 1)**
   - Map legacy styles to `apps/frontend/lib/design-system/tokens.ts` aliases; log gaps as follow-up work.
   - Add Storybook stories for any new tokens and confirm the Storybook a11y addon passes.
3. **Component Migration (Week 2-3)**
   - Replace bespoke Button/Input/etc. with the shadcn-driven implementations under `apps/frontend/components/design-system/`.
   - Extend Vitest + Playwright specs (`apps/frontend/tests/design-system`) to cover product-specific edge cases.
4. **Dark Theme + Preference Sync (Week 3)**
   - Wire the ThemeProvider in the app shell, confirm Supabase preference hydration, and validate fallback logic using the Playwright `theme-fallback.spec.ts`.
5. **Verification & Evidence (Rolling)**
   - Run the Storybook accessibility CI workflow on the feature branch; fix failures before requesting review.
   - Update the relevant checklist entries (visual parity, accessibility, performance) with screenshots, LCP/TTI numbers, and link to Playwright traces.
6. **Change Management (Post-Launch)**
   - Announce adoption status in release notes referencing `docs/design-system/adoption.md`.
   - Schedule quarterly audits to rerun `pnpm --filter @blockbuilders/frontend... run storybook:test` and `pnpm --filter @blockbuilders/frontend... test:e2e --project=design-system` to guard against regressions.

## Governance & Ownership
- **Design System Guild** owns token changes (`apps/frontend/lib/design-system/tokens.ts`) and reviews Storybook docs before merge.
- **Frontend Platform** maintains the Storybook accessibility workflow + CI guardrails and ensures `tokens:build` runs in release pipelines.
- **Product Squads** are responsible for updating their feature checklists and providing manual walkthrough evidence for both themes.

## Risk Mitigation
- **Accessibility Drift**: Enforce the new workflow status check; if it fails, the PR remains blocked until WCAG violations are addressed.
- **Theme Regression**: Every component adoption must include a dark-mode screenshot diff plus a `theme-fallback.spec.ts` assertion.
- **Token Divergence**: Do not inline colors/spacing; instead, add/extend tokens and regenerate CSS via `tokens:build` to keep Tailwind + Storybook in sync.

## Support Channels
- `#design-system` Slack for quick questions.
- Weekly triage with Design + Accessibility leads.
- Async documentation home: this file + `specs/003-design-system-tokens/quickstart.md` for command references.
