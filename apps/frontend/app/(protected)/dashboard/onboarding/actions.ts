'use server';

import { cookies } from 'next/headers';

import {
  fetchChecklist,
  recordTelemetryEvent,
  selectTemplate,
  submitOverride,
  updateStepStatus,
} from '@/lib/onboarding/api';
import type {
  ChecklistResponse,
  OnboardingTelemetryEvent,
  OverridePayload,
  StepStatusPayload,
  TemplateSelectResponse,
  TemplateSelectionPayload,
} from '@/lib/onboarding/types';

const DISMISS_COOKIE = 'onboarding_checklist_dismissed';

export async function loadChecklistAction(): Promise<ChecklistResponse> {
  return fetchChecklist();
}

export async function updateStepStatusAction(
  stepId: string,
  payload: StepStatusPayload,
): Promise<ChecklistResponse> {
  return updateStepStatus(stepId, payload);
}

export async function recordTelemetryEventAction(
  payload: OnboardingTelemetryEvent,
): Promise<void> {
  await recordTelemetryEvent(payload);
}

export async function selectTemplateAction(
  payload: TemplateSelectionPayload,
): Promise<TemplateSelectResponse> {
  return selectTemplate(payload);
}

export async function markOverrideAction(payload: OverridePayload): Promise<void> {
  await submitOverride(payload);
}

export async function dismissChecklistAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: DISMISS_COOKIE,
    value: '1',
    httpOnly: false,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 6, // 6 hours; definition changes will clear via loader.
  });
}

export async function resetChecklistDismissalAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: DISMISS_COOKIE,
    value: '',
    httpOnly: false,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}
