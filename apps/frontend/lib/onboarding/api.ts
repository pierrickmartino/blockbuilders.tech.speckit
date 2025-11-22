import { cookies, headers } from 'next/headers';
import { cache } from 'react';

import type { CookieStoreAdapter } from '@/lib/supabase/cookies';
import { createServerSupabaseClient } from '@/lib/supabase/clients';
import { OnboardingApiError } from './errors';

import type {
  ChecklistResponse,
  OnboardingTelemetryEvent,
  OverridePayload,
  StepStatusPayload,
  TemplateSelectResponse,
  TemplateSelectionPayload,
} from './types';

const API_BASE_URL = process.env.ONBOARDING_API_URL ?? 'http://localhost:8000';
const WORKSPACE_ID_FALLBACK = (process.env.ONBOARDING_DEFAULT_WORKSPACE_ID ?? '').trim() || undefined;

const extractWorkspaceId = (metadata?: Record<string, unknown>): string | undefined => {
  if (!metadata) {
    return undefined;
  }

  for (const key of ['workspace_id', 'workspaceId']) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

interface AuthContext {
  accessToken: string;
  userId: string;
  workspaceId: string;
}

const resolveAuthContext = cache(async (): Promise<AuthContext> => {
  const cookieStore = (await cookies()) as unknown as CookieStoreAdapter;
  const headerStore = await headers();
  const supabase = createServerSupabaseClient({
    cookies: cookieStore,
    headers: headerStore,
  });

  const [sessionResult, userResult] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);

  const {
    data: { session },
    error: sessionError,
  } = sessionResult;
  const {
    data: { user },
    error: userError,
  } = userResult;

  if (sessionError || userError || !session?.access_token || !user) {
    throw new OnboardingApiError(
      'Authentication required for onboarding requests.',
      401,
      sessionError ?? userError ?? undefined,
    );
  }

  const workspaceId =
    extractWorkspaceId(user.user_metadata as Record<string, unknown> | undefined) ??
    extractWorkspaceId(user.app_metadata as Record<string, unknown> | undefined) ??
    WORKSPACE_ID_FALLBACK;

  if (!workspaceId) {
    throw new OnboardingApiError(
      'Workspace context missing for onboarding requests. Add a workspace_id to the authenticated profile (user_metadata or app_metadata) or set ONBOARDING_DEFAULT_WORKSPACE_ID for local testing.',
      400,
    );
  }

  return {
    accessToken: session.access_token,
    userId: user.id,
    workspaceId,
  };
});

type RequestInitish = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

async function request<T>(path: string, init?: RequestInitish): Promise<T> {
  const { accessToken } = await resolveAuthContext();
  const response = await fetch(new URL(path, API_BASE_URL), {
    cache: 'no-store',
    ...init,
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    let message = response.statusText || 'Onboarding request failed';
    if (payload && typeof payload === 'object' && 'detail' in (payload as Record<string, unknown>)) {
      const detail = (payload as Record<string, unknown>).detail;
      if (detail && typeof detail === 'object' && 'message' in (detail as Record<string, unknown>)) {
        message = String((detail as Record<string, unknown>).message);
      } else if (typeof detail === 'string') {
        message = detail;
      }
    }
    throw new OnboardingApiError(message, response.status, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json()) as T;
  return body;
}

export const fetchChecklist = cache(async (): Promise<ChecklistResponse> => {
  return request<ChecklistResponse>('/onboarding/checklist');
});

export async function updateStepStatus(
  stepId: string,
  payload: StepStatusPayload,
): Promise<ChecklistResponse> {
  await request(`/onboarding/steps/${stepId}/status`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return fetchChecklist();
}

export async function recordTelemetryEvent(
  payload: OnboardingTelemetryEvent,
): Promise<void> {
  await request('/onboarding/events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitOverride(payload: OverridePayload): Promise<void> {
  const { userId, workspaceId } = await resolveAuthContext();
  await request('/onboarding/overrides/mark-as-done', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      workspaceId,
      actorId: userId,
      actorRole: 'teammate',
      reason: payload.reason,
      confirmationToken: payload.confirmationToken,
    }),
  });
}

export async function selectTemplate(
  payload: TemplateSelectionPayload,
): Promise<TemplateSelectResponse> {
  return request(`/onboarding/templates/${payload.templateId}/select`, {
    method: 'POST',
    body: JSON.stringify({
      parameterChanges: payload.parameterChanges,
      draftName: payload.draftName,
      canvasContext: payload.canvasContext,
    }),
  });
}
