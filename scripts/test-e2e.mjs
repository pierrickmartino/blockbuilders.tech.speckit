#!/usr/bin/env node

import { spawn } from 'node:child_process';

const args = process.argv.slice(2);

const collectFilters = (cliArgs) => {
  const entries = [];

  for (let index = 0; index < cliArgs.length; index += 1) {
    const token = cliArgs[index];
    if (!token) {
      continue;
    }

    if (token === '--') {
      break;
    }

    if (token === '--filter' || token === '-F') {
      const value = cliArgs[index + 1];
      if (value) {
        entries.push({ value, normalized: normalizeFilter(value) });
        index += 1;
      }
      continue;
    }

    if (token.startsWith('--filter=')) {
      const [, value] = token.split('=');
      if (value) {
        entries.push({ value, normalized: normalizeFilter(value) });
      }
    }
  }

  return entries;
};

const normalizeFilter = (value) =>
  value.replace(/['"]/g, '').replace(/\.\.+$/, '').toLowerCase();

const collectPassthroughArgs = (cliArgs) => {
  const passthrough = [];

  for (let index = 0; index < cliArgs.length; index += 1) {
    const token = cliArgs[index];
    if (!token) {
      continue;
    }

    if (token === '--') {
      passthrough.push(...cliArgs.slice(index + 1));
      break;
    }

    if (token === '--filter' || token === '-F') {
      index += 1;
      continue;
    }

    if (token.startsWith('--filter=')) {
      continue;
    }

    passthrough.push(token);
  }

  return passthrough;
};

const filters = collectFilters(args);
const passthroughArgs = collectPassthroughArgs(args);

const filterFromEnv = process.env.npm_config_filter;
if (filterFromEnv) {
  filters.push({
    value: filterFromEnv,
    normalized: normalizeFilter(filterFromEnv),
  });
}

const FRONTEND_CANDIDATES = [
  '@blockbuilders/frontend',
  'apps/frontend',
  'frontend',
].map((candidate) => normalizeFilter(candidate));

const hasFilters = filters.length > 0;
const shouldRunFrontend =
  !hasFilters ||
  filters.some(({ normalized }) =>
    FRONTEND_CANDIDATES.some((candidate) => candidate.includes(normalized)),
  );

if (!shouldRunFrontend) {
  process.exit(0);
}

const frontendFilterEntry = filters.find(({ normalized }) =>
  FRONTEND_CANDIDATES.some((candidate) => candidate.includes(normalized)),
);

const pnpmFilter =
  [frontendFilterEntry?.value, filterFromEnv].find(
    (value) =>
      value && normalizeFilter(value).includes('@blockbuilders/frontend'),
  ) ?? '@blockbuilders/frontend...';

const pnpmArgs = ['--filter', pnpmFilter, 'run', 'test:e2e'];
if (passthroughArgs.length > 0) {
  pnpmArgs.push('--', ...passthroughArgs);
}

const child = spawn('pnpm', pnpmArgs, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 1;
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
