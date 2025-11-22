import { expect, test } from '@playwright/test';

test.describe('Disclosure approval gate', () => {
  test('shows pending approval state and blocks completion', async ({ page }) => {
    await page.route('**/onboarding/checklist', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          checklistId: '00000000-0000-0000-0000-000000000004',
          version: 1,
          definitionChanged: false,
          overridePending: false,
          localeApproval: {
            locale: 'de-DE',
            approved: false,
            status: 'pending',
            message: 'Copy pending legal approval',
            evidenceLink: 'docs/qa/onboarding-checklist.md#de-de',
          },
          steps: [
            {
              stepId: 'disclosures',
              title: 'Review disclosures',
              description: 'Acknowledge required disclosures before proceeding.',
              requiresDisclosure: true,
              requiresTemplateEdit: false,
              status: 'NOT_STARTED',
              disclosure: {
                text: 'Placeholder copy',
                acknowledgementToken: 'ack-risk-statement-v1',
              },
            },
          ],
        }),
      });
    });

    await page.route('**/onboarding/steps/**', async (route) => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: {
            code: 'locale_unapproved',
            message: 'Locale de-DE is pending approval.',
            context: {
              locale: 'de-DE',
              evidenceLink: 'docs/qa/onboarding-checklist.md#de-de',
            },
          },
        }),
      });
    });

    await page.goto('/dashboard');

    const modal = page.getByTestId('onboarding-checklist-modal');
    await expect(modal).toBeVisible();

    const approvalAlert = modal.getByTestId('locale-approval-alert');
    await expect(approvalAlert).toBeVisible();
    await expect(approvalAlert).toContainText('copy pending approval');
    await expect(approvalAlert.getByRole('link')).toHaveAttribute('href', /docs\/qa\/onboarding-checklist\.md/i);

    const disclosuresButton = modal.getByRole('button', { name: /Mark Review disclosures as done/i });
    await expect(disclosuresButton).toBeDisabled();
    await expect(modal).toContainText('Locale de-DE is awaiting legal approval');
  });
});
