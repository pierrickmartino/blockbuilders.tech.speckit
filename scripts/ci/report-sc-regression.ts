#!/usr/bin/env node
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve, isAbsolute } = require('node:path');

const args = process.argv.slice(2);
const readArg = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
};

const requiredArg = (flag, description) => {
  const value = readArg(flag);
  if (!value) {
    console.error(`[report-sc-regression] Missing ${description} (${flag}).`);
    process.exit(1);
  }
  return value;
};

const tasksFileArg = requiredArg('--tasks', 'tasks file path');
const evidenceArg = requiredArg('--evidence', 'evidence file path');
const reason = readArg('--reason') ?? 'SC metrics regression detected';

const tasksFile = isAbsolute(tasksFileArg)
  ? tasksFileArg
  : resolve(process.cwd(), tasksFileArg);
const evidencePath = isAbsolute(evidenceArg)
  ? evidenceArg
  : resolve(process.cwd(), evidenceArg);

const dateStamp = new Date().toISOString().slice(0, 10);
const entryLine = `- [ ] REM-SC-METRICS (${dateStamp}) ${reason} — Evidence: ${evidencePath}`;

const content = readFileSync(tasksFile, 'utf8');
const remediationPattern = /^- \[[ Xx]\] REM-SC-METRICS.*$/m;

let updated;
if (remediationPattern.test(content)) {
  updated = content.replace(remediationPattern, entryLine);
} else {
  const phaseHeading = content.indexOf('## Phase 5');
  if (phaseHeading === -1) {
    console.error('[report-sc-regression] Unable to locate Phase 5 heading in tasks.md');
    process.exit(1);
  }
  const dividerIndex = content.indexOf('\n---', phaseHeading);
  const insertPosition = dividerIndex === -1 ? content.length : dividerIndex;
  const before = content.slice(0, insertPosition).replace(/\s+$/, '') + '\n';
  const after = content.slice(insertPosition);
  updated = `${before}${entryLine}\n\n${after.startsWith('\n') ? after.slice(1) : after}`;
}

if (updated === content) {
  console.log('[report-sc-regression] No changes were necessary.');
  process.exit(0);
}

writeFileSync(tasksFile, updated);
console.log('[report-sc-regression] Recorded remediation entry in tasks.md');
