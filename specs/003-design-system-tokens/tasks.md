# Tasks: Design System & Tokens

**Input**: Design documents from `/specs/003-design-system-tokens/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish shared documentation and workspace scaffolding for the design system initiative.

- [X] T001 Create Storybook workspace overview in configs/storybook/README.md to document a11y and testing workflows.
- [X] T002 Add design system onboarding guide in apps/frontend/components/design-system/README.md describing folder layout and token build commands.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story work begins.

- [X] T003 Create Storybook base configuration for the Next.js frontend in configs/storybook/main.ts aligning with Storybook 10 builder settings.
- [X] T004 Configure Storybook preview globals to load Tailwind styles and theme context in configs/storybook/preview.ts.
- [X] T005 Register design system scripts (tokens:build, storybook, storybook:test) in apps/frontend/package.json to enable shared tooling.
- [X] T006 Scaffold ThemeProvider shell with light/dark toggles in apps/frontend/components/design-system/ThemeProvider.tsx for later story-specific logic.
- [X] T007 Run repository quality gates via package.json scripts at package.json (`pnpm lint --max-warnings 0`, `pnpm type-check`, `pnpm test:coverage`, `pnpm --filter @blockbuilders/frontend... test:e2e`, `pnpm --filter @blockbuilders/frontend... storybook:test`, `ruff check .`, `uv run pytest`) before story implementation.

---

## Phase 3: User Story 1 - Reference accessible design tokens (Priority: P1) 🎯 MVP

**Goal**: Deliver a canonical token catalog with accessibility metadata that designers and engineers can consume without bespoke styling.

**Independent Test**: Verify the token gallery exposes color, typography, and spacing tokens with WCAG annotations, loads from the generated schema, and can be applied to a new page without introducing custom values.

### Tests for User Story 1 ⚠️

- [X] T008 [P] [US1] Add failing Vitest spec validating token contrast metadata in apps/frontend/tests/design-system/tokens.spec.ts.
- [X] T009 [P] [US1] Add Storybook test-runner scenario auditing token accessibility in configs/storybook/tests/tokens.a11y.spec.ts.

### Implementation for User Story 1

- [X] T010 [P] [US1] Define typed token schema with accessibility metadata in apps/frontend/lib/design-system/tokens.ts.
- [X] T011 [US1] Implement token build script emitting CSS variables in apps/frontend/scripts/build-tokens.ts.
- [X] T012 [US1] Generate base token stylesheet consumed by Next.js in apps/frontend/styles/tokens.css.
- [X] T013 [US1] Extend Tailwind theme mappings to consume tokens in apps/frontend/tailwind.config.ts.
- [X] T014 [US1] Build token gallery component with contrast annotations in apps/frontend/components/design-system/TokenGallery.tsx.
- [X] T015 [US1] Document token usage in Storybook MDX at apps/frontend/components/design-system/stories/TokenCatalog.mdx.
- [X] T016 [US1] Export token catalog entry point in apps/frontend/lib/design-system/index.ts.
- [X] T021 [US1] Record token gallery LCP/TTI metrics via Playwright trace review and log results in specs/003-design-system-tokens/checklists/performance.md.

**Checkpoint**: User Story 1 provides a fully testable token catalog with documented consumption patterns.

---

## Phase 4: User Story 2 - Ship accessible foundation components (Priority: P2)

**Goal**: Provide Button, Input, Select, Modal, and Toast components that consume the approved tokens and satisfy accessibility requirements in light and dark themes.

**Independent Test**: Mount each foundation component, exercise keyboard-only flows, and confirm focus, error, and disabled states honor the documented tokens in both themes.

### Tests for User Story 2 ⚠️

- [X] T022 [P] [US2] Add failing Vitest spec for Button interaction tokens in apps/frontend/tests/design-system/components/Button.spec.tsx.
- [X] T023 [P] [US2] Add failing Vitest spec for Input and Select state tokens in apps/frontend/tests/design-system/components/FormControls.spec.tsx.
- [X] T024 [P] [US2] Add Playwright accessibility walkthrough for Modal and Toast in apps/frontend/tests/e2e/design-system/components-accessibility.spec.ts.
- [X] T025 [P] [US2] Add Playwright spec validating dark-mode fallback when tokens are missing in apps/frontend/tests/e2e/design-system/theme-fallback.spec.ts.

### Implementation for User Story 2

- [X] T026 [P] [US2] Implement token-aware Button component using shadcn primitives in apps/frontend/components/design-system/Button.tsx.
- [X] T027 [P] [US2] Implement token-aware Input component with error states in apps/frontend/components/design-system/Input.tsx.
- [X] T028 [P] [US2] Implement token-aware Select component with keyboard navigation in apps/frontend/components/design-system/Select.tsx.
- [X] T029 [P] [US2] Implement accessible Modal component with focus trapping in apps/frontend/components/design-system/Modal.tsx.
- [X] T030 [P] [US2] Implement Toast provider with announcement hooks in apps/frontend/components/design-system/Toast.tsx.
- [X] T031 [US2] Wire foundation component exports and variants in apps/frontend/components/design-system/index.ts.
- [X] T032 [US2] Author Storybook stories demonstrating components across themes in apps/frontend/components/design-system/stories/FoundationComponents.stories.tsx.
- [X] T033 [US2] Add Storybook MDX usage docs linking tokens to components in apps/frontend/components/design-system/stories/FoundationComponents.docs.mdx.
- [X] T039 [US2] Finalize ThemeProvider logic to sync Supabase preference in apps/frontend/components/design-system/ThemeProvider.tsx.
- [X] T040a [US2] Record light/dark visual parity review checklist for foundation components in specs/003-design-system-tokens/checklists/visual-parity.md with annotated evidence.
- [X] T040 [US2] Integrate ThemeProvider into Next.js root layout in apps/frontend/app/layout.tsx.
- [X] T041 [US2] Measure Storybook build duration and component render metrics, logging results in specs/003-design-system-tokens/checklists/performance.md.
- [X] T042 [US2] Capture manual keyboard walkthrough checklist for components in specs/003-design-system-tokens/checklists/accessibility.md.

**Checkpoint**: User Story 2 delivers accessible foundation components validated across automated and manual accessibility checks.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Quality, documentation, and CI follow-through once user stories land.

- [ ] T043 [P] Add Storybook accessibility CI workflow for design system checks in .github/workflows/storybook-a11y.yml.
- [ ] T044 Document adoption rollout guidelines in docs/design-system/adoption.md.
- [ ] T045 Update quickstart commands for tokens and components in specs/003-design-system-tokens/quickstart.md.

---

## Dependencies & Execution Order

- **Phase Dependencies**: Setup → Foundational → User Story phases (US1 → US2) → Polish.
- **User Story Dependencies**: US1 depends on Phase 2 completion. US2 depends on US1 token exports and shared infrastructure; both must precede the Polish phase.
- **Within Stories**: Tests (fail first) precede implementation; frontend artifacts must align before documentation; performance validation tasks T021 and T041 require preceding implementations.

---

## Parallel Opportunities

- **US1**: T008 and T009 can run in parallel; T010 and T011 can progress concurrently once schema decisions lock; gallery work T014–T015 can overlap with Tailwind integration T013.
- **US2**: Component implementations T026–T030 can be divided per engineer; Storybook tasks T032–T033 run alongside component work; ThemeProvider integration T039–T040 can start after T031; dark-mode fallback validation T025 complements accessibility walkthrough T024.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phases 1–2 to ready shared tooling.  
2. Deliver US1 tokens, ensuring Vitest, Storybook a11y checks, and performance metrics are captured.  
3. Demo token gallery as standalone MVP before proceeding.

### Incremental Delivery

1. US1 tokens establish shared styling primitives.  
2. US2 components consume tokens, finalize ThemeProvider behavior, and close accessibility/performance validations.  
3. Polish phase finalizes rollout, documentation, CI coverage, and quickstart updates.

### Parallel Team Strategy

1. Pair one engineer on Storybook infrastructure (T003–T005) while another scaffolds ThemeProvider (T006) and quality gates (T007).  
2. Split US1 between frontend token schema (T010–T016) and gallery documentation (T014–T015), with a dedicated run capturing performance metrics (T021).  
3. For US2, distribute components (T026–T030) across engineers, keep ThemeProvider integration (T039–T040) aligned with docs, and dedicate accessibility/performance reviewers to T024–T025 and T041–T042.
