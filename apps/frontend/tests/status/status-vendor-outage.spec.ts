import { expect, test } from '@playwright/test';

test('shows vendor outage badge when rate limited', async ({ page }) => {
  await page.route('**/status/summary**', async (route) => {
    await route.fulfill({ json: { assets: [{
      asset: 'BTC',
      interval: 'minute',
      coverage_start: '2025-11-21T00:00:00Z',
      coverage_end: '2025-11-22T00:00:00Z',
      latest_timestamp: '2025-11-22T00:00:00Z',
      freshness_minutes: 120,
      status: 'stale',
      vendor_status: 'rate_limited',
    }] } });
  });

  await page.goto('/status');
  await expect(page.getByTestId('vendor-badge')).toContainText('Unavailable / Rate-limited');
});
