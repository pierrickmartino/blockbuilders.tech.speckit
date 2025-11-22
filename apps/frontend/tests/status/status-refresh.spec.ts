import { expect, test } from '@playwright/test';

test('manual refresh re-fetches without navigation', async ({ page }) => {
  let requestCount = 0;
  await page.route('**/status/summary**', async (route) => {
    requestCount += 1;
    await route.fulfill({ json: { assets: [{
      asset: 'BTC',
      interval: 'minute',
      coverage_start: '2025-11-21T00:00:00Z',
      coverage_end: '2025-11-22T00:00:00Z',
      latest_timestamp: '2025-11-22T00:00:00Z',
      freshness_minutes: requestCount === 1 ? 5 : 4,
      status: 'healthy',
      vendor_status: 'up',
    }] } });
  });

  await page.goto('/status');
  await expect.poll(() => requestCount).toBeGreaterThanOrEqual(1);

  const navigationEntries = await page.evaluate(() => performance.getEntriesByType('navigation').length);
  await page.getByTestId('refresh-button').click();

  await expect.poll(() => requestCount).toBeGreaterThanOrEqual(2);
  const navigationAfter = await page.evaluate(() => performance.getEntriesByType('navigation').length);
  expect(navigationAfter).toBe(navigationEntries);
});


test('auto refresh keeps data fresh', async ({ page }) => {
  let requestCount = 0;
  await page.route('**/status/summary**', async (route) => {
    requestCount += 1;
    await route.fulfill({ json: { assets: [] } });
  });

  await page.goto('/status');
  await expect.poll(() => requestCount).toBeGreaterThanOrEqual(1);
  await page.waitForTimeout(1200);
  await expect.poll(() => requestCount).toBeGreaterThanOrEqual(2);
});
