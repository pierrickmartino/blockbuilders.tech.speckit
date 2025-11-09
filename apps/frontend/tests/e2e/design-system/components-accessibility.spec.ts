import { expect, test } from '@playwright/test';

test.describe('Design system foundation components', () => {
  test('modal traps focus and returns it after close', async ({ page }) => {
    await page.goto('/design-system/components');

    const openButton = page.getByRole('button', { name: 'Open feedback modal' });
    await openButton.focus();
    await expect(openButton).toBeFocused();

    await openButton.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Foundation feedback modal' });
    await expect(dialog).toBeVisible();

    const nameField = page.getByLabel('Full name');
    await expect(nameField).toBeFocused();

    await page.keyboard.press('Tab');
    const emailField = page.getByLabel('Email');
    await expect(emailField).toBeFocused();

    await page.keyboard.press('Tab');
    const componentSelect = page.getByRole('combobox', {
      name: 'Component',
    });
    await expect(componentSelect).toBeFocused();

    await page.keyboard.press('Tab');
    const submit = page.getByRole('button', { name: 'Submit feedback' });
    await expect(submit).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(openButton).toBeFocused();
  });

  test('toast announces status updates', async ({ page }) => {
    await page.goto('/design-system/components');

    const trigger = page.getByRole('button', { name: 'Send toast' });
    await trigger.click();

    const status = page.getByRole('status', { name: 'Component status' });
    await expect(status).toBeVisible();
    await expect(status).toHaveAttribute(
      'data-slot-surface',
      'color.state.success.background',
    );
  });
});
