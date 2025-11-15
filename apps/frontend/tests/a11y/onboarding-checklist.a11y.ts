import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const mockChecklistResponse = {
  checklistId: '00000000-0000-0000-0000-000000000004',
  version: 1,
  definitionChanged: false,
  overridePending: false,
  steps: [
    {
      stepId: 'disclosures',
      title: 'Review disclosures',
      description: 'Acknowledge trading risk disclosures before proceeding.',
      requiresDisclosure: true,
      requiresTemplateEdit: false,
      status: 'NOT_STARTED',
      disclosure: {
        text: 'Trading strategies carry risk.',
        acknowledgementToken: 'ack-risk-statement-v1',
      },
      templateId: null,
    },
    {
      stepId: 'connect_data',
      title: 'Connect data sources',
      description: 'Link broker data.',
      requiresDisclosure: false,
      requiresTemplateEdit: false,
      status: 'NOT_STARTED',
      disclosure: null,
      templateId: null,
    },
  ],
};

const mockRoutes = () => ({
  async attach(page: Page) {
    await page.route('**/onboarding/checklist', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockChecklistResponse),
      });
    });
    await page.route('**/onboarding/steps/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          progressId: 'disclosures-progress',
          stepId: 'disclosures',
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        }),
      });
    });
    await page.route('**/onboarding/events', async (route) => {
      await route.fulfill({ status: 202 });
    });
  },
});

const ROUTES = mockRoutes();

test.describe('Onboarding checklist accessibility', () => {
  test('modal meets axe rules and traps focus', async ({ page }) => {
    await ROUTES.attach(page);

    await page.goto('/dashboard');
    const modal = page.getByTestId('onboarding-checklist-modal');
    await expect(modal).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[data-testid="onboarding-checklist-modal"]')
      .analyze();
    expect(results.violations).toEqual([]);

    const primaryAction = modal.getByRole('button', { name: /Mark Review disclosures as done/i });
    await primaryAction.focus();
    await page.keyboard.press('Tab');
    await expect(modal.getByLabel('Parameter edits')).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(primaryAction).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });
});
