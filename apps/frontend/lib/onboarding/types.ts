export type StepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface ChecklistDisclosure {
  text: string;
  acknowledgementToken?: string | null;
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
}

export interface ChecklistResponse {
  checklistId: string;
  version: number;
  definitionChanged: boolean;
  steps: ChecklistStep[];
}

export interface StepStatusPayload {
  status: StepStatus;
  acknowledgementToken?: string | null;
  templateDiff?: Record<string, unknown> | null;
}

export interface OverridePayload {
  userId: string;
  workspaceId: string;
  reason: string;
  actorId: string;
  actorRole: 'teammate';
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
