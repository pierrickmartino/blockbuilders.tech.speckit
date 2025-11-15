import { expect, test, type Page, type Route } from '@playwright/test';

type StepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

type ChecklistEvent = {
  eventType: string;
  stepId?: string;
};

interface StepDefinition {
  stepId: string;
  title: string;
  description: string;
  requiresDisclosure: boolean;
  requiresTemplateEdit: boolean;
  status: StepStatus;
  disclosure?: { text: string; acknowledgementToken: string } | null;
}

class ChecklistMockServer {
  private steps: Map<string, StepDefinition>;
  private overridePending = false;
  private definitionChanged = false;
  private version = 1;
  private events: ChecklistEvent[] = [];
  private failNextStepUpdate: string | null = null;

  constructor(private readonly page: Page) {
    const initialSteps: StepDefinition[] = [
      {
        stepId: 'disclosures',
        title: 'Review disclosures',
        description: 'Acknowledge trading risk disclosures before proceeding.',
        requiresDisclosure: true,
        requiresTemplateEdit: false,
        disclosure: {
          text: 'Trading strategies carry risk. Continuing confirms acceptance of the Blockbuilders Risk Statement.',
          acknowledgementToken: 'ack-risk-statement-v1',
        },
        status: 'NOT_STARTED',
      },
      {
        stepId: 'connect_data',
        title: 'Connect data sources',
        description: 'Link broker + market data so the workspace can stream quotes.',
        requiresDisclosure: false,
        requiresTemplateEdit: false,
        status: 'NOT_STARTED',
      },
      {
        stepId: 'select_template',
        title: 'Choose a starter template',
        description: 'Pick a curated strategy and edit one parameter before saving.',
        requiresDisclosure: false,
        requiresTemplateEdit: true,
        status: 'NOT_STARTED',
      },
      {
        stepId: 'run_backtest',
        title: 'Run your first backtest',
        description: 'Execute the primed strategy and review activation metrics.',
        requiresDisclosure: false,
        requiresTemplateEdit: false,
        status: 'NOT_STARTED',
      },
    ];

    this.steps = new Map(initialSteps.map((step) => [step.stepId, step]));
  }

  public async setup(): Promise<void> {
    await this.page.route('**/onboarding/**', (route) => this.handle(route));
  }

  public markDefinitionChanged(): void {
    this.definitionChanged = true;
    this.version += 1;
  }

  public setOverridePending(next: boolean): void {
    this.overridePending = next;
  }

  public failNextUpdate(stepId: string): void {
    this.failNextStepUpdate = stepId;
  }

  public captureEvents(): ChecklistEvent[] {
    return this.events;
  }

  private serialize() {
    return {
      checklistId: '00000000-0000-0000-0000-000000000004',
      version: this.version,
      definitionChanged: this.definitionChanged,
      overridePending: this.overridePending,
      steps: Array.from(this.steps.values()).map((step) => ({
        ...step,
        disclosure: step.disclosure ?? null,
        templateId: step.stepId === 'select_template' ? '00000000-0000-0000-0000-00000000a11a' : null,
      })),
    };
  }

  private async handle(route: Route): Promise<void> {
    const { request } = route;
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (request.method() === 'GET' && pathname.endsWith('/onboarding/checklist')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(this.serialize()),
      });
      return;
    }

    if (request.method() === 'POST' && pathname.includes('/onboarding/steps/')) {
      const stepId = pathname.split('/').at(-2) ?? '';

      if (this.failNextStepUpdate === stepId) {
        this.failNextStepUpdate = null;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Service unavailable' }),
        });
        return;
      }

      const step = this.steps.get(stepId);
      if (!step) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ detail: 'missing step' }) });
        return;
      }

      const payload = request.postDataJSON() as {
        status: StepStatus;
        acknowledgementToken?: string | null;
        templateDiff?: Record<string, unknown> | null;
      };

      if (step.requiresDisclosure && !payload.acknowledgementToken) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Disclosure acknowledgement required' }),
        });
        return;
      }

      if (step.requiresTemplateEdit && !payload.templateDiff) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Template diff required' }),
        });
        return;
      }

      step.status = payload.status;
      this.steps.set(step.stepId, step);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          progressId: `${step.stepId}-progress`,
          stepId: step.stepId,
          status: step.status,
          completedAt: new Date().toISOString(),
        }),
      });
      return;
    }

    if (request.method() === 'POST' && pathname.endsWith('/onboarding/overrides/mark-as-done')) {
      const payload = request.postDataJSON() as { confirmationToken?: string; reason?: string };
      if (payload.confirmationToken !== 'override.confirmed.v1') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'confirmation required' }),
        });
        return;
      }

      this.overridePending = true;
      for (const step of this.steps.values()) {
        step.status = 'COMPLETED';
      }

      await route.fulfill({ status: 202 });
      return;
    }

    if (request.method() === 'POST' && pathname.endsWith('/onboarding/events')) {
      const payload = request.postDataJSON() as ChecklistEvent;
      this.events.push(payload);
      if (payload.eventType === 'backtest_success') {
        this.overridePending = false;
      }
      await route.fulfill({ status: 202 });
      return;
    }

    await route.fallback();
  }
}

const setupChecklistMock = async (page: Page): Promise<ChecklistMockServer> => {
  const mock = new ChecklistMockServer(page);
  await mock.setup();
  return mock;
};

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

    await modal.getByLabel('Parameter edits').fill('Increase risk exposure to medium.');
    await modal.getByRole('button', { name: /Mark Choose a starter template as done/i }).click();
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
