#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
};

const resolvePath = (maybePath) => {
  if (!maybePath) {
    return undefined;
  }
  return path.isAbsolute(maybePath)
    ? maybePath
    : path.resolve(process.cwd(), maybePath);
};

const fixturePath = resolvePath(getArg('--fixture'));
const outputPath = resolvePath(getArg('--output')) ?? path.resolve(
  process.cwd(),
  'docs/qa/onboarding-checklist/perf/checklist-interaction-metrics.json',
);
const url = getArg('--url') ?? 'http://localhost:3000/dashboard';
const navTimeout = Number(getArg('--nav-timeout') ?? '20000');
const stepSelectorsArg = getArg('--step-selectors');
const apiPattern = getArg('--api-pattern') ?? '/onboarding/steps';
const thresholdMs = Number(getArg('--threshold-ms') ?? '150');
const stepSelectors = stepSelectorsArg
  ? stepSelectorsArg.split(',').map((value) => value.trim()).filter(Boolean)
  : [];

const normalizeFixture = (payload) => {
  if (!payload?.stepSubmissionSamples || payload.stepSubmissionSamples.length === 0) {
    throw new Error('Fixture missing stepSubmissionSamples array.');
  }
  return payload.stepSubmissionSamples.map((sample) => ({
    stepId: sample.stepId ?? 'unknown',
    durationMs: Number(sample.durationMs),
  }));
};

const summarizeDurations = (samples) => {
  const durations = samples.map((sample) => sample.durationMs);
  const maxMs = Math.max(...durations);
  const averageMs = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  return { durations, maxMs, averageMs };
};

const collectViaBrowser = async () => {
  if (stepSelectors.length === 0) {
    throw new Error('Step selectors are required when fixture mode is not used.');
  }
  const { chromium } = require('@playwright/test');
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: navTimeout });
    await page.waitForLoadState('networkidle', { timeout: navTimeout }).catch(() => {});

    const samples = [];
    for (const selector of stepSelectors) {
      await page.waitForSelector(selector, { state: 'visible', timeout: navTimeout });
      const startedAt = Date.now();
      const responsePromise = page.waitForResponse(
        (response) => response.url().includes(apiPattern) && response.request().method() === 'POST',
        { timeout: navTimeout },
      );
      await page.click(selector, { timeout: navTimeout });
      await responsePromise;
      const durationMs = Date.now() - startedAt;
      samples.push({ stepId: selector, durationMs });
    }
    return samples;
  } finally {
    await browser.close();
  }
};

const persistSummary = (summary) => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2) + '\n');
};

const main = async () => {
  let samples;
  let mode;
  let source;

  if (fixturePath) {
    const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    samples = normalizeFixture(payload);
    mode = 'fixture';
    source = path.relative(process.cwd(), fixturePath);
  } else {
    samples = await collectViaBrowser();
    mode = 'browser';
    source = `${url} (${stepSelectors.join(', ')})`;
  }

  const { durations, maxMs, averageMs } = summarizeDurations(samples);
  const status = maxMs <= thresholdMs ? 'pass' : 'fail';

  const summary = {
    generatedAt: new Date().toISOString(),
    mode,
    source,
    apiPattern,
    thresholdMs,
    averageMs,
    maxMs,
    samples,
    status,
  };

  persistSummary(summary);

  if (status !== 'pass') {
    console.error('[checklist-interaction] Step submission latency exceeded threshold.');
    process.exit(1);
  }

  console.log('[checklist-interaction] Latency within threshold.');
};

main().catch((error) => {
  console.error('[checklist-interaction] Measurement failed:', error.message);
  process.exit(1);
});
