import { expect, test } from '@playwright/test';

const assetsPayload = {
  assets: [
    {
      asset: 'BTC',
      interval: 'minute',
      coverage_start: '2025-11-20T00:00:00Z',
      coverage_end: '2025-11-22T00:00:00Z',
      latest_timestamp: '2025-11-22T00:00:00Z',
      freshness_minutes: 5,
      status: 'healthy',
      vendor_status: 'up',
    },
    {
      asset: 'ETH',
      interval: 'minute',
      coverage_start: '2025-11-20T00:00:00Z',
      coverage_end: '2025-11-22T00:00:00Z',
      latest_timestamp: '2025-11-21T21:00:00Z',
      freshness_minutes: 180,
      status: 'stale',
      vendor_status: 'degraded',
    },
  ],
};

const stalePayload = {
  assets: assetsPayload.assets.filter((a) => a.status !== 'healthy'),
};

test.describe('Status page filters and rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/status/summary**', async (route) => {
      const url = new URL(route.request().url());
      const onlyStale = url.searchParams.get('only_stale') === 'true';
      await route.fulfill({ json: onlyStale ? stalePayload : assetsPayload });
    });

    await page.goto('/status');
  });

  test('renders assets and toggles stale filter', async ({ page }) => {
    const rows = page.getByTestId('status-row');
    await expect(rows).toHaveCount(2);
    await expect(page.getByTestId('vendor-badge')).toContainText('Available');

    await page.getByTestId('stale-filter-toggle').click();
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('ETH');
  });
});
