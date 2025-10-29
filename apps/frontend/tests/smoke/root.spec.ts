import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const landingRoute = '/';

test.describe('Landing page metadata', () => {
  test('exposes build snapshot via data attributes for smoke validation', async ({ page }) => {
    await page.goto(landingRoute);

    const body = page.locator('body');
    await expect(body).toHaveAttribute('data-app-version', /.+/);
    await expect(body).toHaveAttribute('data-app-commit', /.+/);
    await expect(body).toHaveAttribute('data-app-environment', /.+/);
    await expect(body).toHaveAttribute('data-app-timestamp', /.+/);

    await expect(page.getByTestId('metadata-version')).toBeVisible();
    await expect(page.getByTestId('metadata-commit')).toBeVisible();
    await expect(page.getByTestId('metadata-environment')).toBeVisible();
    await expect(page.getByTestId('metadata-timestamp')).toBeVisible();

    const accessibilityScan = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScan.violations).toEqual([]);
  });

  test('renders default metadata labels when git details are unavailable', async ({ page }) => {
    test.skip(
      process.env.PLAYWRIGHT_EXPECT_UNKNOWN_COMMIT !== '1',
      'Fallback scenario runs in a dedicated Playwright project',
    );

    await page.goto(landingRoute);

    await expect(page.getByTestId('metadata-commit')).toHaveText(/Unknown commit/i);
    await expect(page.getByTestId('metadata-version')).toContainText(/0\.1\.0-dev/i);
    await expect(page.getByTestId('metadata-environment')).toHaveText(/Local/i);
  });
});
