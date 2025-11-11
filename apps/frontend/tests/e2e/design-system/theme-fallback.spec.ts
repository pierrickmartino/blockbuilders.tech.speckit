import { expect, test } from '@playwright/test';

const PRIMARY_RGB = 'rgb(26, 86, 219)';

test('falls back to base tokens when CSS variables are missing', async ({ page }) => {
  await page.goto('/design-system/components?theme=dark');

  const primaryButton = page.getByTestId('foundation-button-primary');
  await expect(primaryButton).toBeVisible();

  const inlineStyle = await primaryButton.getAttribute('style');
  expect(inlineStyle).toContain('#1A56DB');
});
