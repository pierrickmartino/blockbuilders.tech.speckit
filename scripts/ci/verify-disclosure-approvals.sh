#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )/../.." && pwd)"
DOC_PATH="${ROOT_DIR}/docs/qa/onboarding-checklist.md"
DOC_REL="docs/qa/onboarding-checklist.md"

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "[verify-disclosure-approvals] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set." >&2
  exit 1
fi

API_ENDPOINT="${SUPABASE_URL%/}/rest/v1/onboarding_disclosures?select=locale,reviewer,reviewed_at,evidence_link"
TMP_JSON="$(mktemp)"
trap 'rm -f "${TMP_JSON}"' EXIT

echo "[verify-disclosure-approvals] Fetching onboarding_disclosures from Supabase..." >&2
curl -sS \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  "${API_ENDPOINT}" > "${TMP_JSON}"

DISCLOSURES_JSON="${TMP_JSON}" DOC_PATH="${DOC_PATH}" DOC_REL="${DOC_REL}" node <<'NODE'
const fs = require('fs');
const path = require('path');

const disclosuresPath = process.env.DISCLOSURES_JSON;
const docPath = process.env.DOC_PATH;
const docRel = process.env.DOC_REL;

const supabaseRaw = fs.readFileSync(disclosuresPath, 'utf8');
const supabaseRows = JSON.parse(supabaseRaw);
if (!Array.isArray(supabaseRows)) {
  console.error('[verify-disclosure-approvals] Supabase response malformed.');
  process.exit(1);
}

const markdown = fs.readFileSync(docPath, 'utf8');
const tablePattern = /^\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/;

const cleanCell = (value) => {
  const trimmed = value.trim();
  if (trimmed.startsWith('`') && trimmed.endsWith('`')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const docApprovals = new Map();
for (const line of markdown.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) continue;
  const match = tablePattern.exec(trimmed);
  if (!match) continue;
  const locale = match[1].trim();
  if (locale.toLowerCase() === 'locale') continue;
  docApprovals.set(locale, {
    locale,
    reviewer: cleanCell(match[2]),
    role: cleanCell(match[3]),
    decisionDate: cleanCell(match[4]),
    evidenceLink: cleanCell(match[5]) || docRel,
  });
}

const supabaseMap = new Map();
for (const row of supabaseRows) {
  if (!row || typeof row !== 'object') continue;
  if (!row.locale) continue;
  supabaseMap.set(row.locale, row);
}

const missing = [];
const mismatched = [];
const undocumented = [];

for (const [locale, approval] of docApprovals.entries()) {
  const row = supabaseMap.get(locale);
  if (!row) {
    missing.push(locale);
    continue;
  }
  const reviewer = (row.reviewer || '').trim();
  const decisionDate = (row.reviewed_at || '').trim();
  if (reviewer !== approval.reviewer || decisionDate !== approval.decisionDate) {
    mismatched.push(
      `${locale} (docs: ${approval.reviewer} @ ${approval.decisionDate} / supabase: ${reviewer || 'n/a'} @ ${decisionDate || 'n/a'})`,
    );
  }
}

for (const locale of supabaseMap.keys()) {
  if (!docApprovals.has(locale)) {
    undocumented.push(locale);
  }
}

if (missing.length || mismatched.length || undocumented.length) {
  if (missing.length) {
    console.error('[verify-disclosure-approvals] Missing locales in Supabase:', missing.join(', '));
  }
  if (mismatched.length) {
    console.error('[verify-disclosure-approvals] Reviewer/date drift detected:', mismatched.join('; '));
  }
  if (undocumented.length) {
    console.error('[verify-disclosure-approvals] Supabase has undocumented locales:', undocumented.join(', '));
  }
  console.error(`[verify-disclosure-approvals] Update ${docRel} or Supabase disclosures before releasing.`);
  process.exit(1);
}

console.log('[verify-disclosure-approvals] Locale approvals match QA registry.');
NODE
