import { expect, test } from '@playwright/test';

import { setupChecklistMock } from './support/checklistMock';

test.describe('Onboarding checklist journey', () => {
  test('persists progress, resume flow, and override confirmation', async ({ page }) => {
    const mock = await setupChecklistMock(page);

    await page.goto('/dashboard');

    const modal = page.getByTestId('onboarding-checklist-modal');
    await expect(modal).toBeVisible();

    await expect(modal.getByRole('button', { name: /Mark Review disclosures as done/i })).toBeFocused();

    await modal.getByRole('button', { name: /Mark Review disclosures as done/i }).click();
    await expect(modal.getByTestId('step-disclosures-status')).toHaveText('Completed');

    await modal.getByRole('button', { name: /Dismiss checklist/i }).click();
    const resumeButton = page.getByRole('button', { name: /Resume onboarding/i });
    await expect(resumeButton).toBeVisible();
    await resumeButton.focus();
    await expect(resumeButton).toBeFocused();
    await resumeButton.click();

    await modal.getByRole('button', { name: /Use Momentum Starter/i }).click();
    await modal.getByLabel('Risk tolerance').fill('balanced');
    await modal.getByRole('button', { name: /Save template & continue/i }).click();
    await expect(modal.getByTestId('step-select_template-status')).toHaveText('Completed');

    await modal.getByRole('button', { name: /Request checklist override/i }).click();
    await page.getByLabel('Override reason').fill('Support confirmed manual activation after review.');
    await page.getByLabel('I understand the activation impact').check();
    await page.getByLabel('I am authorized to override requirements').check();
    await page.getByRole('button', { name: /Confirm override/i }).click();

    const overrideStatus = page.getByRole('status', { name: /Override status/i });
    await expect(overrideStatus).toBeVisible();

    await page.getByRole('button', { name: /Record backtest success/i }).click();
    await expect(page.getByRole('status', { name: /Override status/i })).toHaveCount(0);

    const eventNames = mock.captureEvents().map((event) => event.eventType);
    expect(eventNames).toContain('backtest_success');
  });

  test('recovers after offline interruption without duplicate telemetry', async ({ page }) => {
    const mock = await setupChecklistMock(page);
    mock.failNextUpdate('connect_data');

    await page.goto('/dashboard');

    const modal = page.getByTestId('onboarding-checklist-modal');
    await modal.getByRole('button', { name: /Mark Review disclosures as done/i }).click();

    const connectButton = modal.getByRole('button', { name: /Mark Connect data sources as done/i });
    await connectButton.click();
    await expect(page.getByText(/Something went wrong/i)).toBeVisible();

    await page.reload();
    await page.getByRole('button', { name: /View onboarding checklist/i }).click();
    await modal.getByRole('button', { name: /Mark Connect data sources as done/i }).click();

    const stepCompleteEvents = mock.captureEvents().filter((event) => event.eventType === 'step_complete');
    expect(stepCompleteEvents).toHaveLength(1);
  });

  test('blocks overrides without confirmation token', async ({ page }) => {
    await page.route('**/onboarding/checklist', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          checklistId: '00000000-0000-0000-0000-000000000004',
          version: 1,
          definitionChanged: false,
          overridePending: false,
          steps: [],
        }),
      });
    });

    await page.route('**/onboarding/overrides/mark-as-done', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'confirmation required' }),
      });
    });

    await page.goto('/dashboard');

    const modal = page.getByTestId('onboarding-checklist-modal');
    await modal.getByRole('button', { name: /Request checklist override/i }).click();
    await page.getByLabel('Override reason').fill('Need to override quickly');
    await page.getByRole('button', { name: /Confirm override/i }).click();

    await expect(page.getByText(/confirmation required/i)).toBeVisible();
  });
});
