import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getSubmissionWindowMs,
  registerSubmission,
} from '@/lib/auth/submissionGuard';

describe('submissionGuard', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows first submissions for a key', () => {
    expect(registerSubmission('abc')).toBe(true);
  });

  it('blocks duplicate submissions within the active window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    expect(registerSubmission('dup')).toBe(true);
    expect(registerSubmission('dup')).toBe(false);
  });

  it('allows submissions again once the window elapses', () => {
    vi.useFakeTimers();
    const initial = new Date('2024-01-01T00:00:00Z');
    vi.setSystemTime(initial);

    expect(registerSubmission('later')).toBe(true);

    const windowMs = getSubmissionWindowMs();
    vi.setSystemTime(new Date(initial.getTime() + windowMs + 1));

    expect(registerSubmission('later')).toBe(true);
  });

  it('ignores falsy keys so submissions proceed', () => {
    expect(registerSubmission(undefined)).toBe(true);
    expect(registerSubmission(null)).toBe(true);
    expect(registerSubmission('')).toBe(true);
  });
});
