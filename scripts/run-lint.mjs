#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);

const collectFilters = (cliArgs) => {
  const filters = [];
  for (let index = 0; index < cliArgs.length; index += 1) {
    const token = cliArgs[index];
    if (!token) {
      continue;
    }

    if (token === '--filter' || token === '-F') {
      const value = cliArgs[index + 1];
      if (value) {
        filters.push(value);
        index += 1;
      }
      continue;
    }

    if (token.startsWith('--filter=')) {
      const [, value] = token.split('=');
      if (value) {
        filters.push(value);
      }
    }
  }
  return filters;
};

const filters = collectFilters(args);

const normalizeFilter = (value) =>
  value.replace(/['"]/g, '').replace(/\.\.+$/, '').toLowerCase();

const matchesFilter = (value, candidates) => {
  const normalized = normalizeFilter(value);
  return candidates.some((candidate) => candidate.includes(normalized));
};

const FRONTEND_CANDIDATES = [
  '@blockbuilders/frontend',
  'apps/frontend',
  'frontend',
];
const BACKEND_CANDIDATES = ['apps/backend', 'backend'];

const hasFilters = filters.length > 0;
const shouldRunFrontend =
  !hasFilters ||
  filters.some((filter) => matchesFilter(filter, FRONTEND_CANDIDATES));
const shouldRunBackend =
  !hasFilters ||
  filters.some((filter) => matchesFilter(filter, BACKEND_CANDIDATES));

if (!shouldRunFrontend && !shouldRunBackend) {
  process.exit(0);
}

const run = (command, commandArgs, label) => {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    const exitCode = typeof result.status === 'number' ? result.status : 1;
    console.error(`❌ ${label} failed with status ${exitCode}.`);
    process.exit(exitCode);
  }
};

if (shouldRunFrontend) {
  run(
    'pnpm',
    ['--filter', '@blockbuilders/frontend...', 'lint'],
    'Frontend lint',
  );
}

if (shouldRunBackend) {
  run(
    'uv',
    ['run', '--directory', 'apps/backend', 'ruff', 'check', 'app', 'tests'],
    'Backend lint',
  );
}

process.exit(0);
