export type StepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface ChecklistDisclosure {
  text: string;
  acknowledgementToken?: string | null;
}

export interface TemplateCanvasSchema {
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
}

export interface StarterTemplate {
  templateId: string;
  title: string;
  description: string;
  estimatedRunTime: string;
  defaultParameters: Record<string, number | string>;
  reactFlow: TemplateCanvasSchema;
}

export interface ChecklistStep {
  stepId: string;
  title: string;
  description: string;
  requiresDisclosure: boolean;
  requiresTemplateEdit: boolean;
  status: StepStatus;
  disclosure?: ChecklistDisclosure | null;
  templateId?: string | null;
  overridePending?: boolean;
  overrideReason?: string | null;
  overrideActorRole?: string | null;
  templates?: StarterTemplate[];
  templatesAvailable?: boolean;
}

export interface ChecklistResponse {
  checklistId: string;
  version: number;
  definitionChanged: boolean;
  steps: ChecklistStep[];
  overridePending: boolean;
}

export interface StepStatusPayload {
  status: StepStatus;
  acknowledgementToken?: string | null;
  templateDiff?: Record<string, unknown> | null;
}

export interface TemplateSelectionPayload {
  templateId: string;
  parameterChanges: Record<string, unknown>;
  draftName?: string;
  canvasContext: TemplateCanvasSchema;
}

export interface TemplateSelectResponse {
  draftStrategyId: string;
  checklistStep: ChecklistStep;
  templatesAvailable: boolean;
}

export interface OverridePayload {
  reason: string;
  confirmationToken: string;
}

export interface OnboardingTelemetryEvent {
  eventType:
    | 'viewed'
    | 'step_start'
    | 'step_complete'
    | 'template_selected'
    | 'disclosure_ack'
    | 'override'
    | 'override_pending_cleared'
    | 'backtest_success';
    | 'override_pending_cleared'
    | 'backtest_success';
  stepId?: string;
  templateId?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
  clientContext?: Record<string, unknown>;
}

export interface ChecklistUIState {
  checklist: ChecklistResponse;
  open: boolean;
  busyStepId: string | null;
  busyOverride: boolean;
  error: string | null;
  dismissed: boolean;
}
