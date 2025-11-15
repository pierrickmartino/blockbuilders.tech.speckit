#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )/../.." && pwd)"
EVIDENCE_REL="docs/qa/onboarding-checklist/perf/sc-metrics-latest.json"
EVIDENCE_PATH="${ROOT_DIR}/${EVIDENCE_REL}"
TASKS_FILE="${ROOT_DIR}/specs/004-onboarding-checklist/tasks.md"
METRICS_SCRIPT="${ROOT_DIR}/scripts/ci/verify-sc-metrics.sh"
REPORT_SCRIPT="${ROOT_DIR}/scripts/ci/report-sc-regression.ts"

run_step() {
  local label="$1"
  shift
  echo "\n[onboarding-verify] → ${label}" >&2
  "$@"
}

run_step "pnpm lint" pnpm lint
run_step "pnpm type-check" pnpm type-check
run_step "pnpm test:coverage" pnpm test:coverage
run_step "pnpm test:e2e" pnpm test:e2e
run_step "pnpm test:a11y" pnpm test:a11y
run_step "uv pytest" uv run --directory apps/backend pytest
run_step "checklist render perf" \
  scripts/perf/measure-onboarding-checklist.ts \
  --fixture "${ROOT_DIR}/specs/004-onboarding-checklist/fixtures/checklist-render-fixture.json"
run_step "checklist interaction latency" \
  scripts/perf/checklist-interaction.ts \
  --fixture "${ROOT_DIR}/specs/004-onboarding-checklist/fixtures/checklist-interaction-fixture.json"
run_step "onboarding API load test" \
  uv run python apps/backend/tests/perf/onboarding_load_test.py \
  --fixture "${ROOT_DIR}/specs/004-onboarding-checklist/fixtures/onboarding-api-latency-fixture.json"

if ! "${METRICS_SCRIPT}" "$@"; then
  echo "[onboarding-verify] SC metrics regression detected." >&2
  if [[ -f "${REPORT_SCRIPT}" ]]; then
    node "${REPORT_SCRIPT}" \
      --tasks "${TASKS_FILE}" \
      --evidence "${EVIDENCE_REL}" \
      --reason "SC metrics verification failed"
  fi
  exit 1
fi

run_step "verify disclosure approvals" \
  scripts/ci/verify-disclosure-approvals.sh

echo "[onboarding-verify] Completed all verification steps." >&2
