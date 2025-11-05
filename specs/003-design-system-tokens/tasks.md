# Tasks: Design System & Tokens

**Input**: Design documents from `/specs/003-design-system-tokens/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish shared documentation and workspace scaffolding for the design system initiative.

- [ ] T001 Create Storybook workspace overview in configs/storybook/README.md to document a11y and testing workflows.
- [ ] T002 Add design system onboarding guide in apps/frontend/components/design-system/README.md describing folder layout and token build commands.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story work begins.

- [ ] T003 Create Storybook base configuration for the Next.js frontend in configs/storybook/main.ts aligning with Storybook 8 builder settings.
- [ ] T004 Configure Storybook preview globals to load Tailwind styles and theme context in configs/storybook/preview.ts.
- [ ] T005 Register design system scripts (tokens:build, storybook, storybook:test) in apps/frontend/package.json to enable shared tooling.
- [ ] T006 Scaffold ThemeProvider shell with light/dark toggles in apps/frontend/components/design-system/ThemeProvider.tsx for later story-specific logic.

---

## Phase 3: User Story 1 - Reference accessible design tokens (Priority: P1) 🎯 MVP

**Goal**: Deliver a canonical token catalog with accessibility metadata that designers and engineers can consume without bespoke styling.

**Independent Test**: Verify the token gallery exposes color, typography, and spacing tokens with WCAG annotations and can be applied to a new page without introducing custom values.

### Tests for User Story 1 ⚠️

- [ ] T007 [P] [US1] Add failing Vitest spec validating token contrast metadata in apps/frontend/tests/design-system/tokens.spec.ts.
- [ ] T008 [P] [US1] Add Storybook test-runner scenario auditing token accessibility in configs/storybook/tests/tokens.a11y.spec.ts.

### Implementation for User Story 1

- [ ] T009 [P] [US1] Define typed token schema with accessibility metadata in apps/frontend/lib/design-system/tokens.ts.
- [ ] T010 [US1] Implement token build script emitting CSS variables in apps/frontend/scripts/build-tokens.ts.
- [ ] T011 [US1] Generate base token stylesheet consumed by Next.js in apps/frontend/styles/tokens.css.
- [ ] T012 [US1] Extend Tailwind theme mappings to consume tokens in apps/frontend/tailwind.config.ts.
- [ ] T013 [US1] Build token gallery component with contrast annotations in apps/frontend/components/design-system/TokenGallery.tsx.
- [ ] T014 [US1] Document token usage in Storybook MDX at apps/frontend/components/design-system/stories/TokenCatalog.stories.mdx.
- [ ] T015 [US1] Export token catalog entry point in apps/frontend/lib/design-system/index.ts.
- [ ] T016 [US1] Implement DesignToken Pydantic schema aligned with contracts in apps/backend/app/schemas/design_system/tokens.py.
- [ ] T017 [US1] Add FastAPI route for GET /design-system/tokens in apps/backend/app/api/routes/design_system/tokens.py.
- [ ] T018 [US1] Create token service loader sourcing the schema data in apps/backend/app/services/design_system_tokens.py.
- [ ] T019 [US1] Cover token listing endpoint with tests in apps/backend/tests/api/test_design_system_tokens.py.

**Checkpoint**: User Story 1 provides a fully testable token catalog with documented consumption patterns.

---

## Phase 4: User Story 2 - Ship accessible foundation components (Priority: P2)

**Goal**: Provide Button, Input, Select, Modal, and Toast components that consume the approved tokens and satisfy accessibility requirements in light and dark themes.

**Independent Test**: Mount each foundation component, exercise keyboard-only flows, and confirm focus, error, and disabled states honor the documented tokens in both themes.

### Tests for User Story 2 ⚠️

- [ ] T020 [P] [US2] Add failing Vitest spec for Button interaction tokens in apps/frontend/tests/design-system/components/Button.spec.tsx.
- [ ] T021 [P] [US2] Add failing Vitest spec for Input and Select state tokens in apps/frontend/tests/design-system/components/FormControls.spec.tsx.
- [ ] T022 [P] [US2] Add Playwright accessibility walkthrough for Modal and Toast in apps/frontend/tests/e2e/design-system/components-accessibility.spec.ts.

### Implementation for User Story 2

- [ ] T023 [P] [US2] Implement token-aware Button component using shadcn primitives in apps/frontend/components/design-system/Button.tsx.
- [ ] T024 [P] [US2] Implement token-aware Input component with error states in apps/frontend/components/design-system/Input.tsx.
- [ ] T025 [P] [US2] Implement token-aware Select component with keyboard navigation in apps/frontend/components/design-system/Select.tsx.
- [ ] T026 [P] [US2] Implement accessible Modal component with focus trapping in apps/frontend/components/design-system/Modal.tsx.
- [ ] T027 [P] [US2] Implement Toast provider with announcement hooks in apps/frontend/components/design-system/Toast.tsx.
- [ ] T028 [US2] Wire foundation component exports and variants in apps/frontend/components/design-system/index.ts.
- [ ] T029 [US2] Author Storybook stories demonstrating components across themes in apps/frontend/components/design-system/stories/FoundationComponents.stories.tsx.
- [ ] T030 [US2] Add Storybook MDX usage docs linking tokens to components in apps/frontend/components/design-system/stories/FoundationComponents.docs.mdx.
- [ ] T031 [US2] Implement FoundationComponent schemas and list/detail handlers in apps/backend/app/api/routes/design_system/components.py.
- [ ] T032 [US2] Implement ThemePreference schemas and GET/PATCH handlers in apps/backend/app/api/routes/design_system/theme_preference.py.
- [ ] T033 [US2] Add backend services for component metadata and theme preference persistence in apps/backend/app/services/design_system_components.py.
- [ ] T034 [US2] Extend Pydantic models for ComponentState and ThemePreference in apps/backend/app/schemas/design_system/components.py.
- [ ] T035 [US2] Cover component and theme preference endpoints with tests in apps/backend/tests/api/test_design_system_components.py.
- [ ] T036 [US2] Finalize ThemeProvider logic to sync Supabase preference in apps/frontend/components/design-system/ThemeProvider.tsx.
- [ ] T037 [US2] Integrate ThemeProvider into Next.js root layout in apps/frontend/app/layout.tsx.
- [ ] T038 [US2] Capture manual keyboard walkthrough checklist for components in specs/003-design-system-tokens/checklists/accessibility.md.

**Checkpoint**: User Story 2 delivers accessible foundation components validated across automated and manual accessibility checks.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Quality, documentation, and CI follow-through once user stories land.

- [ ] T039 [P] Add Storybook accessibility CI workflow for design system checks in .github/workflows/storybook-a11y.yml.
- [ ] T040 Document adoption rollout guidelines in docs/design-system/adoption.md.
- [ ] T041 Update quickstart commands for tokens and components in specs/003-design-system-tokens/quickstart.md.

---

## Dependencies & Execution Order

- **Phase Dependencies**: Setup → Foundational → User Story phases (US1 → US2) → Polish.
- **User Story Dependencies**: US1 depends on Phase 2 completion. US2 depends on US1 token exports and shared infrastructure; both must precede the Polish phase.
- **Within Stories**: Tests (fail first) precede implementation; frontend artifacts must align before backend handlers expose data; documentation follows functional completion.

---

## Parallel Opportunities

- **US1**: T007 and T008 can run in parallel; T009 and T010 can progress concurrently once schema decisions lock; backend tasks T016–T018 can run alongside frontend gallery work.
- **US2**: Component implementations T023–T027 can be divided per engineer; backend endpoints T031–T033 run parallel to frontend Storybook tasks T029–T030; ThemeProvider integration T036–T037 can start after T028.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phases 1–2 to ready shared tooling.  
2. Deliver US1 tokens, ensuring Vitest and Storybook a11y checks pass.  
3. Demo token gallery as standalone MVP before proceeding.

### Incremental Delivery

1. US1 tokens establish shared styling primitives.  
2. US2 components consume tokens and extend backend contracts.  
3. Polish phase finalizes rollout, documentation, and CI coverage.

### Parallel Team Strategy

1. Pair one engineer on Storybook infrastructure (T003–T005) while another scaffolds ThemeProvider (T006).  
2. Split US1 between frontend token schema (T009–T014) and backend contract work (T016–T019).  
3. For US2, distribute components (T023–T027) across engineers, dedicate backend specialist to T031–T035, and assign accessibility verification to T022 and T038.
