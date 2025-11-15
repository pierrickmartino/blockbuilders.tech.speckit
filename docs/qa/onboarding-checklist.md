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
- SC metrics + performance captures live under `docs/qa/onboarding-checklist/perf/`:
  - `sc-metrics-latest.json` – output from `scripts/ci/verify-sc-metrics.sh` showing SC-01/02/03 pass/fail (override_pending sessions are excluded until `backtest_success`).
  - `checklist-render-metrics.json` – automated React Profiler/Web Vitals capture from `scripts/perf/measure-onboarding-checklist.ts` (≤1 s SLA).
  - `checklist-interaction-metrics.json` – async persistence latency samples from `scripts/perf/checklist-interaction.ts` (≤150 ms per step).
  - `onboarding-api-latency.json` – Supabase/FastAPI p95 evidence produced by `apps/backend/tests/perf/onboarding_load_test.py`.

## Datadog Assets

- Monitor pack: `configs/datadog/onboarding-checklist.json` (render ≤1 s, API p95 ≤200 ms, override_pending stale guard).
- Forwarder monitors: `configs/datadog/onboarding-forwarder.json` (fan-out ≤60 s, forwarder errors, SC-03 success rate).
- Funnel dashboard + Supabase views: `configs/datadog/onboarding-funnel.json` defines `analytics.onboarding_sc01_latency`, `analytics.onboarding_sc02_time_to_backtest`, and `analytics.onboarding_sc03_template_success`. All views filter out workspaces with `override_pending = true` until a `backtest_success` clears the flag, matching FR-009 governance requirements.

## Approval Workflow

1. Product/legal drafts copy inside `specs/004-onboarding-checklist/checklists/disclosures.md`.
2. Legal reviewer signs off and records their name/date here.
3. Engineering updates `scripts/seed-onboarding.ts` + Supabase seeds with the approved locale payloads.
4. Release automation checks this registry prior to deploying new locales.
