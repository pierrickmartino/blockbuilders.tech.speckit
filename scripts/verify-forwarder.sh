#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE="${DATADOG_SITE:-datadoghq.com}"
API_KEY="${DATADOG_API_KEY:-}"
APP_KEY="${DATADOG_APP_KEY:-}"
SOURCE="${DATADOG_FORWARDER_SOURCE:-onboarding-checklist}"

PAYLOADS=(
  '{"eventType":"template_selected","stepId":"select_template","templateId":"00000000-0000-0000-0000-00000000a11a","metadata":{"workspaceId":"demo-workspace","parameterChanges":{"lookback":30}},"clientContext":{"sessionId":"seed"}}'
  '{"eventType":"override_pending_cleared","stepId":"run_backtest","metadata":{"workspaceId":"demo-workspace","overrideActor":"support"},"clientContext":{}}'
  '{"eventType":"backtest_success","stepId":"run_backtest","metadata":{"workspaceId":"demo-workspace","p95Latency":180},"clientContext":{}}'
)

if [[ "${VERIFY_FORWARDER_SEND:-0}" != "1" ]]; then
  echo "[verify-forwarder] Dry run. Export VERIFY_FORWARDER_SEND=1 to call Datadog." >&2
  for payload in "${PAYLOADS[@]}"; do
    echo "Payload: ${payload}"
  done
  exit 0
fi

if [[ -z "${API_KEY}" || -z "${APP_KEY}" ]]; then
  echo "DATADOG_API_KEY and DATADOG_APP_KEY must be set to forward events." >&2
  exit 1
fi

DD_ENDPOINT="https://${SITE}/api/v1/events"

for payload in "${PAYLOADS[@]}"; do
  body=$(cat <<JSON
{
  "title": "Onboarding telemetry validation",
  "text": ${payload},
  "tags": ["source:${SOURCE}"]
}
JSON
)
  curl --fail --silent --show-error \
    -X POST "${DD_ENDPOINT}" \
    -H "DD-API-KEY: ${API_KEY}" \
    -H "DD-APPLICATION-KEY: ${APP_KEY}" \
    -H "Content-Type: application/json" \
    -d "${body}" >/dev/null
  echo "Forwarded onboarding payload: ${payload}"
done

echo "[verify-forwarder] Completed onboarding telemetry verification via Datadog"
