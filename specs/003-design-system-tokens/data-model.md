# Data Model

## Entities

### DesignToken
- **Fields**
  - `id`: string (unique semantic name, e.g., `color.background.default`)
  - `category`: enum (`color`, `typography`, `spacing`, `radii`, `shadow`)
  - `role`: enum (`background`, `foreground`, `border`, `content`, `layout`, `motion`)
  - `value`: string (light theme value; color hex, rem scale, etc.)
  - `darkValue`: string (optional override for dark theme; defaults to `value`)
  - `description`: string (usage guidance + accessibility notes)
  - `wcagRatio`: number (contrast ratio when applicable)
  - `aliases`: string[] (semantic aliases consumed by components)
  - `status`: enum (`draft`, `approved`, `deprecated`)
  - `version`: string (semver to track updates)
- **Relationships**
  - Linked to one or more `FoundationComponent` instances through `aliases`.
  - Referenced by `ComponentState` definitions to enforce accessibility defaults.
- **Validation**
  - `id` must be kebab-case and unique.
  - `wcagRatio` ≥ 4.5 for text tokens and ≥ 3.0 for large text / UI tokens.
  - `darkValue` must pass the same WCAG ratio checks when paired with corresponding light theme tokens.

### ComponentState
- **Fields**
  - `id`: string (e.g., `button.focus.visible`)
  - `componentId`: reference to `FoundationComponent.id`
  - `interaction`: enum (`default`, `hover`, `focus`, `active`, `disabled`, `error`, `success`)
  - `tokens`: array of `DesignToken.id` (one per semantic slot)
  - `ariaAttributes`: record<string, string> (role-specific ARIA requirements)
  - `announcements`: string[] (screen reader messaging)
  - `focusOrder`: number (tab order expectation where applicable)
- **Relationships**
  - Belongs to a single `FoundationComponent`.
  - Must reference approved `DesignToken` entries for every visual slot.
- **Validation**
  - `tokens` array cannot contain deprecated tokens.
  - `focusOrder` increments sequentially within a component.
  - `ariaAttributes` must match WAI-ARIA specs for the component role.

### FoundationComponent
- **Fields**
  - `id`: string (e.g., `button`, `input`, `select`, `modal`, `toast`)
  - `category`: enum (`form`, `overlay`, `feedback`)
  - `description`: string (usage guidance + accessibility notes)
  - `tokensBySlot`: record<string, `DesignToken.id`> (e.g., background, border)
  - `states`: `ComponentState.id`[]
  - `variants`: string[] (e.g., `primary`, `secondary`, `destructive`, `outline`)
  - `dependencies`: string[] (Radix primitive + shadcn base component references)
- **Relationships**
  - Consumes many `DesignToken` instances via `tokensBySlot`.
  - Owns multiple `ComponentState` entries.
- **Validation**
  - Each variant must map all required slots to approved tokens.
  - `states` must include at least `default`, `focus`, `disabled`, and contextual states relevant to the component (error for Input, destructive for Button).

### ThemePreference
- **Fields**
  - `id`: string (composite `userId` or `anonymous` + device fingerprint)
  - `mode`: enum (`system`, `light`, `dark`)
  - `source`: enum (`system`, `user-toggle`)
  - `updatedAt`: datetime
- **Relationships**
  - Read by Next.js layout loader to choose CSS variable set.
- **Validation**
  - Defaults to `system` when no explicit choice is stored.
  - `updatedAt` must refresh whenever a user override occurs.

## Relationships & Flows
- `DesignToken` defines the canonical styling options. Each `FoundationComponent` references these tokens through `tokensBySlot` and `ComponentState` definitions, guaranteeing consistent visuals and accessibility metadata.
- `ComponentState` ensures keyboard/focus and ARIA requirements are tied directly to the tokens for each interaction, providing traceability between the spec and implementation.
- `ThemePreference` selects which token values to hydrate on the client (light vs dark) and integrates with Supabase session data so that Storybook and the application behave consistently across devices.
