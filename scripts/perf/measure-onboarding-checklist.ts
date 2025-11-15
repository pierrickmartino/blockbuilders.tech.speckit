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
  if (!maybePath) return undefined;
  return path.isAbsolute(maybePath)
    ? maybePath
    : path.resolve(process.cwd(), maybePath);
};

const fixturePath = resolvePath(getArg('--fixture'));
const outputPath = resolvePath(getArg('--output')) ?? path.resolve(
  process.cwd(),
  'docs/qa/onboarding-checklist/perf/checklist-render-metrics.json',
);
const selector = getArg('--selector') ?? '[data-testid="onboarding-checklist-modal"]';
const url = getArg('--url') ?? 'http://localhost:3000/dashboard';
const navTimeout = Number(getArg('--nav-timeout') ?? '20000');
const renderTimeout = Number(getArg('--render-timeout') ?? '10000');
const width = Number(getArg('--width') ?? '1280');
const height = Number(getArg('--height') ?? '720');

const thresholds = {
  timeToChecklistMs: 1000,
  largestContentfulPaintMs: 2500,
};

const normalizeFixture = (payload) => {
  if (!payload) {
    throw new Error('Fixture payload is empty.');
  }
  const metrics = payload.metrics ?? payload;
  const timeToChecklistMs = Number(metrics.timeToChecklistMs);
  const largestContentfulPaintMs =
    metrics.largestContentfulPaintMs !== undefined && metrics.largestContentfulPaintMs !== null
      ? Number(metrics.largestContentfulPaintMs)
      : null;
  const firstContentfulPaintMs =
    metrics.firstContentfulPaintMs !== undefined && metrics.firstContentfulPaintMs !== null
      ? Number(metrics.firstContentfulPaintMs)
      : null;

  if (Number.isNaN(timeToChecklistMs)) {
    throw new Error('Fixture is missing timeToChecklistMs.');
  }

  return {
    timeToChecklistMs,
    largestContentfulPaintMs,
    firstContentfulPaintMs,
  };
};

const collectViaBrowser = async () => {
  let browser;
  try {
    const { chromium } = require('@playwright/test');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: navTimeout });
    await page.waitForLoadState('networkidle', { timeout: navTimeout }).catch(() => {});
    await page.waitForSelector(selector, { state: 'visible', timeout: renderTimeout });
    const metrics = await page.evaluate(() => {
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      const paints = performance.getEntriesByType('paint');
      const fcpEntry = paints.find((entry) => entry.name === 'first-contentful-paint');
      return {
        timeToChecklistMs: performance.now(),
        largestContentfulPaintMs:
          lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : null,
        firstContentfulPaintMs: fcpEntry?.startTime ?? null,
      };
    });
    return metrics;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

const persistSummary = (summary) => {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2) + '\n');
};

const main = async () => {
  let metrics;
  let mode;
  let source;

  if (fixturePath) {
    const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    metrics = normalizeFixture(payload);
    mode = 'fixture';
    source = path.relative(process.cwd(), fixturePath);
  } else {
    metrics = await collectViaBrowser();
    mode = 'browser';
    source = url;
  }

  const status = {
    checklistRender:
      metrics.timeToChecklistMs <= thresholds.timeToChecklistMs ? 'pass' : 'fail',
    lcp:
      metrics.largestContentfulPaintMs === null
        ? 'unknown'
        : metrics.largestContentfulPaintMs <= thresholds.largestContentfulPaintMs
          ? 'pass'
          : 'fail',
  };

  const summary = {
    generatedAt: new Date().toISOString(),
    mode,
    source,
    selector,
    metrics,
    thresholds,
    status,
  };

  persistSummary(summary);

  if (Object.values(status).some((value) => value === 'fail')) {
    console.error('[measure-onboarding-checklist] Render budget failed.');
    process.exit(1);
  }

  console.log('[measure-onboarding-checklist] Metrics captured successfully.');
};

main().catch((error) => {
  console.error('[measure-onboarding-checklist] Measurement failed:', error.message);
  process.exit(1);
});
