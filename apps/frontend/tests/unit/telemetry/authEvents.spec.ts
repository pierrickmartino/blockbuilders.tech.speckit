import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  emitAuthSignInEvent,
  emitAuthSignOutEvent,
  resetAuthTelemetrySink,
  setAuthTelemetrySink,
  type AuthTelemetryEvent,
} from '../../../lib/telemetry/authEvents';

describe('auth telemetry events', () => {
  const events: AuthTelemetryEvent[] = [];

  beforeEach(() => {
    events.length = 0;
    setAuthTelemetrySink((event) => {
      events.push(event);
    });
  });

  afterEach(() => {
    resetAuthTelemetrySink();
    events.length = 0;
  });

  it('emits a sanitized sign-in success event', () => {
    emitAuthSignInEvent({
      outcome: 'success',
      email: 'test.user@example.com',
      userId: '7347b662-9fdf-4f5c-8cc7-224d5141785e',
      route: 'https://app.local/auth/sign-in?utm_source=test',
      metadata: {
        mechanism: 'password',
      },
    });

    expect(events).toHaveLength(1);
    const event = events[0];

    expect(event.event).toBe('auth.sign_in');
    expect(event.outcome).toBe('success');
    expect(event.channel).toBe('frontend');
    expect(event.context.route).toBe('/auth/sign-in');
    expect(event.context.surface === 'client' || event.context.surface === 'api_route').toBe(true);
    expect(event.context.flow).toBe('email_password');
    expect(event.identifiers.emailHash).toMatch(/^fnv1a-/);
    expect(event.identifiers.userIdHash).toMatch(/^fnv1a-/);
    expect(event.metadata?.mechanism).toBe('password');
    expect(new Date(event.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('never includes raw PII values in the serialized payload', () => {
    const rawEmail = 'sensitive@example.com';
    const rawUserId = 'user-123';

    emitAuthSignInEvent({
      outcome: 'failure',
      email: rawEmail,
      userId: rawUserId,
      errorCode: 'invalid_credentials',
      errorReason: 'Invalid credentials',
    });

    const payload = JSON.stringify(events[0]);

    expect(payload.includes(rawEmail)).toBe(false);
    expect(payload.includes(rawUserId)).toBe(false);
    expect(payload.includes('Invalid credentials')).toBe(true);
    expect(events[0].error?.code).toBe('invalid_credentials');
  });

  it('emits a sign-out event using hashed identifiers', () => {
    emitAuthSignOutEvent({
      outcome: 'success',
      email: 'another.user@example.com',
      metadata: {
        trigger: 'manual',
      },
    });

    expect(events).toHaveLength(1);
    const event = events[0];

    expect(event.event).toBe('auth.sign_out');
    expect(event.identifiers.emailHash).toMatch(/^fnv1a-/);
    expect(event.identifiers.userIdHash).toBeUndefined();
    expect(event.metadata?.trigger).toBe('manual');
    expect(event.pii).toBe('redacted');
  });
});

