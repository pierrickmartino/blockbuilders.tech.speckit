#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )/../.." && pwd)"
DEFAULT_EVENTS_FILE="${ROOT_DIR}/specs/004-onboarding-checklist/fixtures/sc-metrics-fixture.json"
EVENTS_FILE="${SC_METRICS_EVENTS:-${1:-${DEFAULT_EVENTS_FILE}}}"
EVIDENCE_DIR="${ROOT_DIR}/docs/qa/onboarding-checklist/perf"
EVIDENCE_FILE="${EVIDENCE_DIR}/sc-metrics-latest.json"

if [[ ! -f "${EVENTS_FILE}" ]]; then
  echo "[verify-sc-metrics] Missing telemetry fixture: ${EVENTS_FILE}" >&2
  exit 1
fi

export EVENTS_FILE
export EVIDENCE_DIR
export EVIDENCE_FILE
export ROOT_DIR

node <<'NODE'
const fs = require('fs');
const path = require('path');

const eventsFile = process.env.EVENTS_FILE;
const evidenceDir = process.env.EVIDENCE_DIR;
const evidenceFile = process.env.EVIDENCE_FILE;
const rootDir = process.env.ROOT_DIR;

const raw = fs.readFileSync(eventsFile, 'utf8');
const events = JSON.parse(raw);
if (!Array.isArray(events) || events.length === 0) {
  console.error('[verify-sc-metrics] No events to analyze.');
  process.exit(1);
}

const overrideSessions = new Set();
const clearedSessions = new Set();
for (const event of events) {
  const sessionId = event.sessionId;
  if (!sessionId) continue;
  if (event.eventType === 'override') {
    overrideSessions.add(sessionId);
  }
  if (event.eventType === 'backtest_success' || event.eventType === 'override_pending_cleared') {
    clearedSessions.add(sessionId);
  }
}
const blockedSessions = new Set(
  [...overrideSessions].filter((id) => !clearedSessions.has(id)),
);

const filteredEvents = events.filter((event) => {
  if (!event.sessionId) {
    return false;
  }
  return !blockedSessions.has(event.sessionId);
});

const ensureEvents = (collection, label) => {
  if (collection.length === 0) {
    console.error(`[verify-sc-metrics] Missing ${label} events after filtering.`);
    process.exit(1);
  }
};

const sc01Candidates = filteredEvents.filter((event) => event.eventType === 'viewed');
ensureEvents(sc01Candidates, 'viewed');
const sc01Pass = sc01Candidates.filter(
  (event) => typeof event.renderDurationMs === 'number' && event.renderDurationMs <= 1000,
);
const sc01Ratio = sc01Pass.length / sc01Candidates.length;
const SC01_THRESHOLD = 0.9;
const sc01Status = sc01Ratio >= SC01_THRESHOLD ? 'pass' : 'fail';

const firstView = new Map();
const firstSuccess = new Map();
for (const event of filteredEvents) {
  if (!event.sessionId || !event.timestamp) continue;
  const ts = Date.parse(event.timestamp);
  if (Number.isNaN(ts)) continue;
  if (event.eventType === 'viewed' && !firstView.has(event.sessionId)) {
    firstView.set(event.sessionId, ts);
  }
  if (event.eventType === 'backtest_success' && !firstSuccess.has(event.sessionId)) {
    firstSuccess.set(event.sessionId, ts);
  }
}
const sc02Durations = [];
for (const [sessionId, viewedTs] of firstView.entries()) {
  if (!firstSuccess.has(sessionId)) continue;
  const duration = firstSuccess.get(sessionId) - viewedTs;
  if (duration > 0) {
    sc02Durations.push(duration);
  }
}
ensureEvents(sc02Durations, 'backtest_success');
sc02Durations.sort((a, b) => a - b);
const medianAt = (values) => {
  const mid = Math.floor(values.length / 2);
  if (values.length % 2 === 0) {
    return (values[mid - 1] + values[mid]) / 2;
  }
  return values[mid];
};
const sc02Median = medianAt(sc02Durations);
const SC02_THRESHOLD = 15 * 60 * 1000; // 15 minutes in milliseconds
const sc02Status = sc02Median <= SC02_THRESHOLD ? 'pass' : 'fail';

const templateSessions = new Set();
const templateSuccessSessions = new Set();
for (const event of filteredEvents) {
  if (!event.sessionId) continue;
  if (event.eventType === 'template_selected') {
    templateSessions.add(event.sessionId);
  }
  if (event.eventType === 'backtest_success') {
    templateSuccessSessions.add(event.sessionId);
  }
}
ensureEvents([...templateSessions], 'template_selected');
let sc03SuccessCount = 0;
for (const sessionId of templateSessions) {
  if (templateSuccessSessions.has(sessionId)) {
    sc03SuccessCount += 1;
  }
}
const sc03Ratio = sc03SuccessCount / templateSessions.size;
const SC03_THRESHOLD = 0.7;
const sc03Status = sc03Ratio >= SC03_THRESHOLD ? 'pass' : 'fail';

const summary = {
  generatedAt: new Date().toISOString(),
  eventsFile: path.relative(rootDir, eventsFile),
  ignoredSessions: [...blockedSessions],
  metrics: {
    'SC-01': {
      description: 'Checklist visible ≤1s for 90% of new workspaces',
      ratio: Number(sc01Ratio.toFixed(4)),
      threshold: SC01_THRESHOLD,
      status: sc01Status,
      counts: {
        withinBudget: sc01Pass.length,
        total: sc01Candidates.length,
      },
    },
    'SC-02': {
      description: 'Median time view→backtest ≤15m',
      medianMs: sc02Median,
      thresholdMs: SC02_THRESHOLD,
      status: sc02Status,
      samples: sc02Durations.length,
    },
    'SC-03': {
      description: '≥70% of template selections succeed',
      ratio: Number(sc03Ratio.toFixed(4)),
      threshold: SC03_THRESHOLD,
      status: sc03Status,
      counts: {
        successfulSessions: sc03SuccessCount,
        templateSessions: templateSessions.size,
      },
    },
  },
};

fs.mkdirSync(evidenceDir, { recursive: true });
fs.writeFileSync(evidenceFile, JSON.stringify(summary, null, 2) + '\n');

const failing = Object.entries(summary.metrics)
  .filter(([, value]) => value.status !== 'pass')
  .map(([key]) => key);

if (failing.length > 0) {
  console.error('[verify-sc-metrics] Failed metrics:', failing.join(', '));
  console.error(`Evidence written to ${path.relative(rootDir, evidenceFile)}`);
  process.exit(1);
}

console.log('[verify-sc-metrics] All SC metrics satisfied.');
console.log(`Evidence written to ${path.relative(rootDir, evidenceFile)}`);
NODE
