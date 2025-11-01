#!/usr/bin/env bash
# Collects repository build metadata for reuse across tooling pipelines.

set -euo pipefail

PACKAGE_JSON_PATH=""
PYPROJECT_PATH=""
FALLBACK_VERSION="0.1.0-dev"

usage() {
  cat <<'EOF'
Usage: collect-build-metadata.sh [options]

Outputs a JSON object with version, commit, and timestamp fields. The script
prefers the APP_VERSION environment variable, then a detected package manifest,
and finally falls back to 0.1.0-dev.

Options:
  --package-json <path>  Explicit path to a package.json file.
  --pyproject <path>     Explicit path to a pyproject.toml file.
  --fallback-version <v> Override the default fallback version (0.1.0-dev).
  -h, --help             Show this message and exit.
EOF
}

while (($#)); do
  case "$1" in
    --package-json)
      PACKAGE_JSON_PATH="${2:-}"
      shift 2
      ;;
    --pyproject)
      PYPROJECT_PATH="${2:-}"
      shift 2
      ;;
    --fallback-version)
      FALLBACK_VERSION="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown option '$1'" >&2
      usage
      exit 1
      ;;
  esac
done

trim() {
  local value="$1"
  # shellcheck disable=SC2001
  echo "$(sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' <<<"$value")"
}

resolve_version() {
  if [[ -n "${APP_VERSION:-}" ]]; then
    VERSION="$(trim "${APP_VERSION}")"
    [[ -n "$VERSION" ]] && return
  fi

  local path candidate

  path="$PACKAGE_JSON_PATH"
  if [[ -z "$path" && -f package.json ]]; then
    path="package.json"
  fi
  if [[ -n "$path" && -f "$path" ]]; then
    candidate="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$path" | head -n1)"
    if [[ -n "$candidate" ]]; then
      VERSION="$(trim "$candidate")"
      return
    fi
  fi

  path="$PYPROJECT_PATH"
  if [[ -z "$path" && -f pyproject.toml ]]; then
    path="pyproject.toml"
  fi
  if [[ -n "$path" && -f "$path" ]]; then
    candidate="$(sed -n 's/^version[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "$path" | head -n1)"
    if [[ -n "$candidate" ]]; then
      VERSION="$(trim "$candidate")"
      return
    fi
  fi

  VERSION="$FALLBACK_VERSION"
}

resolve_commit() {
  if commit="$(git rev-parse --short HEAD 2>/dev/null)"; then
    COMMIT="$(trim "$commit")"
  else
    COMMIT="unknown"
  fi
  if [[ -z "$COMMIT" ]]; then
    COMMIT="unknown"
  fi
}

resolve_timestamp() {
  TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}

resolve_version
resolve_commit
resolve_timestamp

printf '{"version":"%s","commit":"%s","timestamp":"%s"}\n' "$VERSION" "$COMMIT" "$TIMESTAMP"
