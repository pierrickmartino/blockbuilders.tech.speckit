import { expect, test } from '@playwright/test';

import { setupChecklistMock } from './support/checklistMock';

test.describe('Template selection + canvas priming', () => {
  test('primes the React Flow canvas and records telemetry events', async ({ page }) => {
    const mock = await setupChecklistMock(page);

    await page.goto('/dashboard');
    const modal = page.getByTestId('onboarding-checklist-modal');

    await modal.getByRole('button', { name: /Use Momentum Starter/i }).click();
    await modal.getByLabel('Risk tolerance').fill('balanced');
    await modal.getByRole('button', { name: /Save template & continue/i }).click();

    await expect(modal.getByTestId('template-canvas-preview')).toBeVisible();
    await expect(modal.getByTestId('step-select_template-status')).toHaveText('Completed');

    const events = mock.captureEvents().map((event) => event.eventType);
    expect(events).toContain('template_selected');
  });

  test('shows fallback CTA when templates are unavailable', async ({ page }) => {
    const mock = await setupChecklistMock(page);
    mock.setTemplatesAvailable(false);

    await page.goto('/dashboard');
    const modal = page.getByTestId('onboarding-checklist-modal');

    await expect(modal.getByText(/Templates are temporarily unavailable/i)).toBeVisible();
    const fallbackLink = modal.getByRole('link', { name: /Explore the strategy library/i });
    await expect(fallbackLink).toHaveAttribute('href', '/docs/templates/strategy-library.md');
  });

  test('surfaces an error when the template selection request is unauthorized', async ({ page }) => {
    await setupChecklistMock(page);

    await page.route('**/onboarding/templates/**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Authentication required' }),
      });
    });

    await page.goto('/dashboard');
    const modal = page.getByTestId('onboarding-checklist-modal');

    await modal.getByRole('button', { name: /Use Momentum Starter/i }).click();
    await modal.getByLabel('Risk tolerance').fill('balanced');
    await modal.getByRole('button', { name: /Save template & continue/i }).click();

    await expect(modal.getByText(/Authentication required/i)).toBeVisible();
  });
});
