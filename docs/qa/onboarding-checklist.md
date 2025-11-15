# QA & Compliance Evidence — Onboarding Checklist (FR-011)

Last updated: 2025-11-15

## Locale Approval Registry

| Locale | Reviewer | Role | Decision Date | Evidence |
|--------|----------|------|---------------|----------|
| en-US  | Maya Patel | Senior Counsel | 2025-11-13 | `specs/004-onboarding-checklist/checklists/disclosures.md#en-us` |
| en-GB  | Liam O'Connell | Compliance Lead | 2025-11-13 | `specs/004-onboarding-checklist/checklists/disclosures.md#en-gb` |
| fr-FR  | Camille Laurent | Legal Counsel (EU) | 2025-11-14 | `specs/004-onboarding-checklist/checklists/disclosures.md#fr-fr` |

Future locales must append to both this table and the disclosure copy doc **before** seeds run. CI validation (T053) will compare Supabase locale metadata with this registry.

## Evidence Attachments

- Accessibility notes + WCAG confirmations documented alongside the feature spec once UI exists.
- Datadog telemetry exports will be stored under `docs/qa/onboarding-checklist/perf/` (folder reserved) when Phase 5 lands.

## Approval Workflow

1. Product/legal drafts copy inside `specs/004-onboarding-checklist/checklists/disclosures.md`.
2. Legal reviewer signs off and records their name/date here.
3. Engineering updates `scripts/seed-onboarding.ts` + Supabase seeds with the approved locale payloads.
4. Release automation checks this registry prior to deploying new locales.

