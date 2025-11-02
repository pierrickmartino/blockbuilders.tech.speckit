#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const separatorIndex = args.indexOf('--');
const cliArgs =
  separatorIndex >= 0 ? args.slice(0, separatorIndex) : args;
const scriptArgs =
  separatorIndex >= 0 ? args.slice(separatorIndex + 1) : [];

const filters = [];
const forwardedFlags = [];

for (let i = 0; i < cliArgs.length; i += 1) {
  const arg = cliArgs[i];
  if (arg === '--filter' || arg === '-F') {
    const value = cliArgs[i + 1];
    if (!value) {
      console.error('Expected a filter value after', arg);
      process.exit(1);
    }
    filters.push(value);
    i += 1;
  } else if (arg.startsWith('--filter=')) {
    filters.push(arg.slice('--filter='.length));
  } else if (arg.startsWith('-F=')) {
    filters.push(arg.slice('-F='.length));
  } else {
    forwardedFlags.push(arg);
  }
}

if (filters.length === 0) {
  filters.push('@blockbuilders/frontend...');
}

const pnpmArgs = [];
for (const filter of filters) {
  pnpmArgs.push('--filter', filter);
}
pnpmArgs.push(...forwardedFlags, 'run', 'type-check');
if (scriptArgs.length > 0) {
  pnpmArgs.push('--', ...scriptArgs);
}

const result = spawnSync('pnpm', pnpmArgs, {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

const status = result.status ?? (result.signal ? 1 : 0);
if (result.signal) {
  console.error(`pnpm exited with signal ${result.signal}`);
}
process.exit(status);
