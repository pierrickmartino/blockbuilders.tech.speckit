#!/usr/bin/env bash

# Synchronize Supabase-related secrets across Vercel and GitHub Actions.
# The script can also validate that example env files stay in parity with the CI template.
#
# Usage:
#   ./configs/scripts/sync_supabase_secrets.sh --check
#   ./configs/scripts/sync_supabase_secrets.sh --from-file ./secrets/supabase.env --target production
#   LOG_DIR=artifacts ./configs/scripts/sync_supabase_secrets.sh --from-file ./secrets/supabase.env --target preview --dry-run
#
# Required tools when performing syncs (non --check mode):
#   - `vercel` CLI (optional, only if pushing to Vercel)
#   - `gh` CLI (optional, only if pushing to GitHub)
#   - `jq` or POSIX tooling (no runtime requirement beyond standard utilities)
#
# Expected inputs:
#   --from-file <path> : file containing KEY=VALUE pairs for Supabase secrets. The file is never committed.
#   --target <env>     : deployment target (defaults to production). Maps to Vercel env + GitHub environment name.
#   --dry-run          : output planned operations without mutating remote secrets.
#   --check            : skip sync and ensure template/example files stay aligned.
#
# Environment variables influencing runtime:
#   LOG_DIR                : directory for archived logs (defaults to configs/scripts/logs)
#   VERCEL_PROJECT_ID      : Vercel project identifier (required to push secrets)
#   VERCEL_ORG_ID / TEAM   : Optional Vercel team identifier
#   VERCEL_TOKEN           : Vercel access token (required to push secrets)
#   GITHUB_REPOSITORY      : owner/repo slug for gh CLI (required to push secrets)
#   GITHUB_ENVIRONMENT     : Optional GitHub environment name when storing environment-scoped secrets
#
# The script redacts secret values and records sha256 fingerprints for audit trails.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TEMPLATE_FILE="${REPO_ROOT}/configs/ci/supabase.env.tpl"
FRONT_ENV_FILE="${REPO_ROOT}/apps/frontend/.env.example"
BACK_ENV_FILE="${REPO_ROOT}/apps/backend/.env.example"

usage() {
  cat <<'USAGE'
Usage: sync_supabase_secrets.sh [options]

Options:
  --check                 Validate template/example parity and exit.
  --from-file <path>      Source file containing Supabase secrets for syncing.
  --target <env>          Deployment target (default: production).
  --dry-run               Print intended actions without mutating remote services.
  -h, --help              Show this help message.
USAGE
}

hash_secret() {
  local value="$1"
  if command -v shasum >/dev/null 2>&1; then
    printf '%s' "$value" | shasum -a 256 | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    printf '%s' "$value" | sha256sum | awk '{print $1}'
  else
    python3 - <<'PY' "$value"
import hashlib, sys
print(hashlib.sha256(sys.argv[1].encode("utf-8")).hexdigest())
PY
  fi
}

collect_keys() {
  local file_path="$1"
  if [[ ! -f "$file_path" ]]; then
    return
  fi
  grep -E '^[A-Z0-9_]+\s*=' "$file_path" | cut -d '=' -f1
}

collect_supabase_keys() {
  collect_keys "$1" | grep -E '^SUPABASE|^NEXT_PUBLIC_SUPABASE' || true
}

parity_check() {
  local exit_code=0
  local template_keys frontend_keys backend_keys
  template_keys="$(collect_supabase_keys "$TEMPLATE_FILE" | sort -u)"
  frontend_keys="$(collect_supabase_keys "$FRONT_ENV_FILE" | sort -u)"
  backend_keys="$(collect_supabase_keys "$BACK_ENV_FILE" | sort -u)"

  local frontend_missing=""
  local backend_missing=""

  while IFS= read -r key; do
    [[ -z "$key" ]] && continue
    if ! printf '%s\n' "$template_keys" | grep -Fxq "$key"; then
      frontend_missing="${frontend_missing} ${key}"
    fi
  done <<< "$frontend_keys"

  while IFS= read -r key; do
    [[ -z "$key" ]] && continue
    if ! printf '%s\n' "$template_keys" | grep -Fxq "$key"; then
      backend_missing="${backend_missing} ${key}"
    fi
  done <<< "$backend_keys"

  if [[ -n "${frontend_missing// }" ]]; then
    echo "Parity check failed: template missing frontend keys:${frontend_missing}" >&2
    exit_code=1
  fi

  if [[ -n "${backend_missing// }" ]]; then
    echo "Parity check failed: template missing backend keys:${backend_missing}" >&2
    exit_code=1
  fi

  if [[ -z "${template_keys// }" ]]; then
    echo "Parity check failed: template produced no Supabase keys." >&2
    exit_code=1
  fi

  if [[ $exit_code -eq 0 ]]; then
    local key_count
    key_count=$(printf '%s\n' "$template_keys" | sed '/^$/d' | wc -l | tr -d ' ')
    echo "Supabase parity check passed: template contains ${key_count} keys."
  fi

  return "$exit_code"
}

MODE="sync"
ENV_FILE=""
TARGET="production"
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check)
      MODE="check"
      shift
      ;;
    --from-file)
      ENV_FILE="$2"
      shift 2
      ;;
    --target)
      TARGET="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ "$MODE" == "check" ]]; then
  parity_check
  exit $?
fi

if [[ -z "$ENV_FILE" ]]; then
  echo "Error: --from-file is required when syncing secrets." >&2
  usage
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: secrets file not found at $ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo "Error: template file missing at $TEMPLATE_FILE" >&2
  exit 1
fi

TEMPLATE_KEYS=()
while IFS= read -r key; do
  [[ -z "$key" ]] && continue
  TEMPLATE_KEYS+=("$key")
done < <(collect_supabase_keys "$TEMPLATE_FILE" | sort -u)

if ((${#TEMPLATE_KEYS[@]} == 0)); then
  echo "Error: no Supabase keys discovered in $TEMPLATE_FILE" >&2
  exit 1
fi

SECRET_KEYS=()
SECRET_VALUES=()
while IFS='=' read -r key value; do
  [[ -z "$key" ]] && continue
  if [[ "$key" == \#* ]]; then
    continue
  fi
  case "$key" in
    SUPABASE*|NEXT_PUBLIC_SUPABASE*)
      SECRET_KEYS+=("$key")
      SECRET_VALUES+=("${value}")
      ;;
  esac
done < <(grep -E '^[A-Z0-9_]+\s*=' "$ENV_FILE")

get_secret_value() {
  local lookup="$1"
  local i
  for i in "${!SECRET_KEYS[@]}"; do
    if [[ "${SECRET_KEYS[$i]}" == "$lookup" ]]; then
      echo "${SECRET_VALUES[$i]}"
      return 0
    fi
  done
  return 1
}

missing_values=()
for key in "${TEMPLATE_KEYS[@]}"; do
  if [[ -z "$(get_secret_value "$key" 2>/dev/null)" ]]; then
    missing_values+=("$key")
  fi
done

if ((${#missing_values[@]} > 0)); then
  echo "Error: missing values for keys: ${missing_values[*]}" >&2
  exit 1
fi

LOG_DIRECTORY="${LOG_DIR:-${SCRIPT_DIR}/logs}"
mkdir -p "$LOG_DIRECTORY"
timestamp="$(date +%Y%m%d-%H%M%S)"
log_file="${LOG_DIRECTORY}/supabase-sync-${TARGET}-${timestamp}.log"

exec > >(tee -a "$log_file")
exec 2> >(tee -a "$log_file" >&2)

echo "Starting Supabase secret sync at ${timestamp}"
echo "Target environment: ${TARGET}"
echo "Sourcing secrets from: ${ENV_FILE}"
echo "Log file: ${log_file}"
echo ""

for key in "${TEMPLATE_KEYS[@]}"; do
  value="$(get_secret_value "$key")"
  fingerprint="$(hash_secret "$value")"
  echo "Prepared value for ${key} (sha256:${fingerprint})"
done

echo ""

if command -v vercel >/dev/null 2>&1 && [[ -n "${VERCEL_PROJECT_ID:-}" ]] && [[ -n "${VERCEL_TOKEN:-}" ]]; then
  echo "Syncing secrets to Vercel project ${VERCEL_PROJECT_ID}..."
  vercel_args=(env add)
  for key in "${TEMPLATE_KEYS[@]}"; do
    if (( DRY_RUN == 1 )); then
      echo "[dry-run] vercel env add ${key} ${TARGET}"
      continue
    fi
    printf '%s' "$(get_secret_value "$key")" | vercel env add "${key}" "${TARGET}" --token "${VERCEL_TOKEN}" --project "${VERCEL_PROJECT_ID}" --yes >/dev/null
    echo "Updated Vercel secret ${key}"
  done
else
  echo "Skipping Vercel sync (missing vercel CLI or VERCEL_PROJECT_ID/VERCEL_TOKEN)."
fi

echo ""

if command -v gh >/dev/null 2>&1 && [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
  echo "Syncing secrets to GitHub repository ${GITHUB_REPOSITORY}..."
  for key in "${TEMPLATE_KEYS[@]}"; do
    if (( DRY_RUN == 1 )); then
      echo "[dry-run] gh secret set ${key} --repo ${GITHUB_REPOSITORY} ${GITHUB_ENVIRONMENT:+--env ${GITHUB_ENVIRONMENT}}"
      continue
    fi
    value="$(get_secret_value "$key")"
    if [[ -n "${GITHUB_ENVIRONMENT:-}" ]]; then
      gh secret set "${key}" --repo "${GITHUB_REPOSITORY}" --env "${GITHUB_ENVIRONMENT}" --app actions --body "$value" >/dev/null
    else
      gh secret set "${key}" --repo "${GITHUB_REPOSITORY}" --app actions --body "$value" >/dev/null
    fi
    echo "Updated GitHub secret ${key}"
  done
else
  echo "Skipping GitHub sync (missing gh CLI or GITHUB_REPOSITORY)."
fi

echo ""
echo "Supabase secret sync completed."
