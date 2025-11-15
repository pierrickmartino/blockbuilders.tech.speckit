import { cookies, headers } from 'next/headers';
import { cache } from 'react';

import type { CookieStoreAdapter } from '@/lib/supabase/cookies';
import { createServerSupabaseClient } from '@/lib/supabase/clients';

import type {
  ChecklistResponse,
  OnboardingTelemetryEvent,
  OverridePayload,
  StepStatusPayload,
} from './types';

const API_BASE_URL = process.env.ONBOARDING_API_URL ?? 'http://localhost:8000';

export class OnboardingApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'OnboardingApiError';
  }
}

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

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token || !session.user) {
    throw new OnboardingApiError(
      'Authentication required for onboarding requests.',
      401,
      error ?? undefined,
    );
  }

  const workspaceId =
    ((session.user.user_metadata as Record<string, unknown> | undefined)?.workspace_id as string | undefined) ??
    ((session.user.app_metadata as Record<string, unknown> | undefined)?.workspace_id as string | undefined);

  if (!workspaceId) {
    throw new OnboardingApiError('Workspace context missing for onboarding requests.', 400);
  }

  return {
    accessToken: session.access_token,
    userId: session.user.id,
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
    const message =
      typeof payload === 'object' && payload && 'detail' in payload
        ? String((payload as Record<string, unknown>).detail)
        : response.statusText || 'Onboarding request failed';
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
