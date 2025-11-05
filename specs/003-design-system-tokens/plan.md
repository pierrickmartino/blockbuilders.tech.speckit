# Implementation Plan: Design System & Tokens

**Branch**: `003-design-system-tokens` | **Date**: 2025-11-05 | **Spec**: specs/003-design-system-tokens/spec.md  
**Input**: Feature specification from `/specs/003-design-system-tokens/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a shared design system inside the Next.js 15 frontend: centralize color/typography/spacing tokens as generated Tailwind + CSS variables, build shadcn-based foundation components (Button, Input, Select, Modal, Toast) that consume those tokens, and verify accessibility through Storybook a11y checks and keyboard walkthroughs.

## Technical Context

**Language/Version**: TypeScript (Next.js 15 App Router, React 19)  
**Primary Dependencies**: Tailwind CSS 3.4, shadcn/ui (Radix primitives), Storybook 8 with @storybook/addon-a11y, Supabase client (existing auth plumbing), Zod 3  
**Storage**: N/A (tokens defined in JSON/TypeScript schema and emitted to CSS variables)  
**Testing**: Vitest + Testing Library (unit), Playwright + @axe-core/playwright (smoke/a11y), Storybook test-runner for accessibility regressions  
**Target Platform**: Web (Next.js 15, evergreen browsers, SSR + RSC hybrid)  
**Project Type**: web  
**Performance Goals**: Token gallery and component docs render ≤2.0s TTI / ≤2.5s LCP in CI reference profile; Storybook build completes within existing pipeline SLO (≤8 min)  
**Constraints**: Maintain WCAG 2.2 AA contrast/focus, reuse Tailwind tokens + shadcn primitives, avoid new runtime deps without governance review, preserve Supabase auth compatibility  
**Scale/Scope**: Shared library for all @blockbuilders/frontend surfaces; initial drop covers full token catalog + 5 foundation components + Storybook docs

## Constitution Check

- **Code Quality Without Compromise**: Run `pnpm lint --max-warnings 0`, `pnpm type-check`, `pnpm test:coverage`, `pnpm --filter @blockbuilders/frontend... test:e2e`, and Storybook accessibility CI (`pnpm --filter @blockbuilders/frontend... storybook:test`) prior to implementation sign-off; peer review confirms adherence.
- **Simplicity Over Speculation**: Deliverables map directly to FR-001 (token catalog generation), FR-002 (usage guidance + docs), FR-003 (foundation components), and FR-004 (dark theme parity). No additional components or tooling beyond shadcn/ui will ship without an exception.
- **Test Evidence First**: Author failing Vitest suites for token utilities and component behaviors, Playwright keyboard smoke tests for each foundation component, and Storybook a11y snapshots before implementation to maintain ≥80% coverage and catch regressions.
- **Consistent Experience Every Time**: Implement tokens via Tailwind config and CSS variables consumed by shadcn components, validate with Storybook + @storybook/addon-a11y, and record manual keyboard walkthrough logs against the acceptance scenarios.
- **Performance and Reliability Budgets**: Measure Storybook build times, monitor Next.js route performance via existing telemetry dashboards, and capture LCP/TTI metrics in Playwright traces to ensure budgets stay within constitution thresholds.

## Project Structure

### Documentation (this feature)

```text
specs/003-design-system-tokens/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md          # Created by /speckit.tasks after Phase 2
```

### Source Code (repository root)

```text
apps/
├── backend/
│   ├── app/
│   └── tests/
└── frontend/
    ├── app/
    ├── components/
    │   ├── auth/
    │   └── design-system/      # new slice for tokens + shadcn foundation components
    ├── lib/
    │   └── design-system/      # token schema + conversion utilities
    ├── styles/
    └── tests/

configs/
└── storybook/                  # central Storybook configuration for tokens/components
```

**Structure Decision**: Extend the existing Next.js app in `apps/frontend` with a dedicated `design-system` slice for tokens, components, and utilities while keeping backend scope untouched; Storybook config lives under `configs/storybook` for shared CI hooks.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
