#!/usr/bin/env node

import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const filter = process.env.npm_config_filter ?? '@blockbuilders/frontend...';

const passthroughIndex = args.indexOf('--');
const passthroughArgs = passthroughIndex === -1 ? [] : args.slice(passthroughIndex + 1);

const pnpmArgs = ['--filter', filter, 'test:coverage'];
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
