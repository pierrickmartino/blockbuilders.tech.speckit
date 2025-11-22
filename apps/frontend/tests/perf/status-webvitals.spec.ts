import { expect, test } from '@playwright/test';

test('captures web vitals budgets for status page', async ({ page, context }) => {
  await page.route('**/status/summary**', async (route) => {
    await route.fulfill({ json: { assets: [{
      asset: 'BTC',
      interval: 'day',
      coverage_start: '2025-11-01T00:00:00Z',
      coverage_end: '2025-11-22T00:00:00Z',
      latest_timestamp: '2025-11-22T00:00:00Z',
      freshness_minutes: 10,
      status: 'healthy',
      vendor_status: 'up',
    }] } });
  });

  await context.tracing.start({ screenshots: true, snapshots: true });
  await page.goto('/status');
  await page.waitForSelector('[data-testid="status-row"]');

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const lcpEntry = performance.getEntriesByType('largest-contentful-paint').pop() as PerformanceEntry | undefined;
    const tti = nav ? nav.domInteractive - nav.startTime : null;
    const lcp = lcpEntry ? lcpEntry.startTime : null;
    return { tti, lcp };
  });

  if (metrics.tti !== null) {
    expect(metrics.tti).toBeLessThanOrEqual(2000);
  }
  if (metrics.lcp !== null) {
    expect(metrics.lcp).toBeLessThanOrEqual(2500);
  }

  await context.tracing.stop({ path: 'artifacts/status-webvitals-trace.zip' });
});
