import type { Page, Route } from '@playwright/test';

type StepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

type ChecklistEvent = {
  eventType: string;
  stepId?: string;
  templateId?: string;
};

export interface TemplateDefinition {
  templateId: string;
  title: string;
  description: string;
  estimatedRunTime: string;
  defaultParameters: Record<string, string | number>;
  reactFlow: {
    nodes: Array<Record<string, unknown>>;
    edges: Array<Record<string, unknown>>;
  };
}

interface StepDefinition {
  stepId: string;
  title: string;
  description: string;
  requiresDisclosure: boolean;
  requiresTemplateEdit: boolean;
  status: StepStatus;
  disclosure?: { text: string; acknowledgementToken: string } | null;
  templates?: TemplateDefinition[];
  templatesAvailable?: boolean;
}

const DEFAULT_TEMPLATES: TemplateDefinition[] = [
  {
    templateId: '00000000-0000-0000-0000-00000000a11a',
    title: 'Momentum Starter',
    description: 'Follows short-term momentum with guard rails.',
    estimatedRunTime: '≤5 min',
    defaultParameters: {
      riskTolerance: 'low',
      capitalAllocation: 25,
    },
    reactFlow: {
      nodes: [
        { id: 'source', type: 'input', position: { x: 0, y: 0 }, data: { label: 'Source' } },
        { id: 'filter', position: { x: 200, y: 100 }, data: { label: 'Momentum filter' } },
        { id: 'backtest', type: 'output', position: { x: 400, y: 0 }, data: { label: 'Backtest' } },
      ],
      edges: [
        { id: 'e1', source: 'source', target: 'filter' },
        { id: 'e2', source: 'filter', target: 'backtest' },
      ],
    },
  },
];

export class ChecklistMockServer {
  private steps: Map<string, StepDefinition>;
  private overridePending = false;
  private definitionChanged = false;
  private version = 1;
  private events: ChecklistEvent[] = [];
  private failNextStepUpdate: string | null = null;
  private templatesAvailable = true;
  private templates: TemplateDefinition[] = DEFAULT_TEMPLATES;

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
        templates: this.templates,
        templatesAvailable: this.templatesAvailable,
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

  public setTemplates(templates: TemplateDefinition[]): void {
    this.templates = templates;
    this.templatesAvailable = templates.length > 0;
    const templateStep = this.steps.get('select_template');
    if (templateStep) {
      templateStep.templates = templates;
      templateStep.templatesAvailable = this.templatesAvailable;
      this.steps.set('select_template', templateStep);
    }
  }

  public setTemplatesAvailable(next: boolean): void {
    this.templatesAvailable = next;
    const templateStep = this.steps.get('select_template');
    if (templateStep) {
      templateStep.templatesAvailable = next;
      if (!next) {
        templateStep.templates = [];
      }
      this.steps.set('select_template', templateStep);
    }
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
        templateId: step.stepId === 'select_template' ? this.templates.at(0)?.templateId ?? null : null,
        templates: step.templates ?? [],
        templatesAvailable: step.templatesAvailable ?? true,
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

    if (request.method() === 'POST' && pathname.includes('/onboarding/templates/')) {
      if (!this.templatesAvailable || this.templates.length === 0) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'No templates available' }),
        });
        return;
      }

      const payload = request.postDataJSON() as {
        parameterChanges?: Record<string, unknown>;
        canvasContext?: Record<string, unknown>;
      };

      if (!payload.parameterChanges || Object.keys(payload.parameterChanges).length === 0) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Parameter changes required' }),
        });
        return;
      }

      const templateStep = this.steps.get('select_template');
      if (templateStep) {
        templateStep.status = 'COMPLETED';
        this.steps.set('select_template', templateStep);
      }

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          draftStrategyId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          templatesAvailable: this.templatesAvailable,
          checklistStep: {
            ...(templateStep ?? {}),
            stepId: 'select_template',
            status: 'COMPLETED',
            templates: this.templates,
            templatesAvailable: this.templatesAvailable,
          },
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

export const setupChecklistMock = async (page: Page): Promise<ChecklistMockServer> => {
  const mock = new ChecklistMockServer(page);
  await mock.setup();
  return mock;
};
