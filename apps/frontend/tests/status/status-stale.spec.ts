import { expect, test } from '@playwright/test';

test('stale alert clears after data catches up', async ({ page }) => {
  let requestCount = 0;
  await page.route('**/status/summary**', async (route) => {
    requestCount += 1;
    const stale = requestCount === 1;

    await route.fulfill({
      json: {
        assets: [
          {
            asset: 'BTC',
            interval: 'minute',
            coverage_start: '2025-11-21T00:00:00Z',
            coverage_end: '2025-11-22T00:00:00Z',
            latest_timestamp: stale ? '2025-11-22T00:00:00Z' : '2025-11-22T00:55:00Z',
            freshness_minutes: stale ? 120 : 5,
            status: stale ? 'stale' : 'healthy',
            vendor_status: 'up',
            alert_status: stale ? 'open' : 'cleared',
            last_alerted_at: '2025-11-22T01:00:00Z',
            last_alert_lag_minutes: 120,
          },
        ],
      },
    });
  });

  await page.goto('/status');
  await expect(page.getByTestId('alert-badge')).toBeVisible();

  await page.getByTestId('refresh-button').click();
  await expect.poll(() => requestCount).toBeGreaterThanOrEqual(2);

  await expect(page.getByTestId('alert-badge')).toHaveCount(0);
  await expect(page.getByTestId('status-row').first()).toContainText('healthy');
});
