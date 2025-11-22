'use client';

import type { OnboardingTelemetryEvent } from '@/lib/onboarding/types';

const DEDUP_EVENT_TYPES: ReadonlySet<OnboardingTelemetryEvent['eventType']> = new Set([
  'step_complete',
  'disclosure_ack',
  'template_selected',
]);

type AnalyticsSink = (event: OnboardingTelemetryEvent) => Promise<void> | void;

const generateSessionId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `onboarding-${Math.random().toString(36).slice(2)}`;
};

const serializeKey = (event: OnboardingTelemetryEvent): string => {
  const step = event.stepId ?? 'global';
  const template = event.templateId ?? 'template';
  return `${event.eventType}:${step}:${template}`;
};

export class OnboardingAnalytics {
  private readonly sink: AnalyticsSink;
  private readonly sessionId: string;
  private emittedKeys = new Set<string>();

  constructor(sink: AnalyticsSink) {
    this.sink = sink;
    this.sessionId = generateSessionId();
  }

  async emit(event: OnboardingTelemetryEvent): Promise<void> {
    const key = serializeKey(event);

    if (DEDUP_EVENT_TYPES.has(event.eventType) && this.emittedKeys.has(key)) {
      return;
    }

    if (DEDUP_EVENT_TYPES.has(event.eventType)) {
      this.emittedKeys.add(key);
    }

    const enriched: OnboardingTelemetryEvent = {
      ...event,
      occurredAt: event.occurredAt ?? new Date().toISOString(),
      clientContext: {
        sessionId: this.sessionId,
        ...(event.clientContext ?? {}),
      },
    };

    await Promise.resolve(this.sink(enriched));
  }

  reset(): void {
    this.emittedKeys.clear();
  }
}

export const createOnboardingAnalytics = (sink: AnalyticsSink): OnboardingAnalytics => {
  return new OnboardingAnalytics(sink);
};
