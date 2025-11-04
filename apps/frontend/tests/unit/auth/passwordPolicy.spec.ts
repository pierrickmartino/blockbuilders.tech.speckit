import { describe, expect, it } from 'vitest';

import {
  PASSWORD_POLICY_MIN_LENGTH,
  evaluatePasswordPolicy,
} from '../../../lib/auth/passwordPolicy';

const legacyNow = new Date('2025-03-01T12:00:00.000Z');

describe('evaluatePasswordPolicy', () => {
  it('treats passwords meeting every requirement as valid', () => {
    const result = evaluatePasswordPolicy('ValidPassword1!');

    expect(result.isValid).toBe(true);
    expect(result.canContinue).toBe(true);
    expect(result.failedRequirements).toHaveLength(0);
    expect(result.summary).toContain('Password meets');
    expect(result.guidance[0]).toMatch(/unique/i);
  });

  it('reports missing requirements with actionable copy', () => {
    const result = evaluatePasswordPolicy('lowercaseonly1!');

    expect(result.isValid).toBe(false);
    expect(result.canContinue).toBe(false);
    expect(result.failedRequirements.map((req) => req.id)).toEqual([
      'uppercase',
    ]);
    expect(result.summary).toContain('uppercase letter');
    expect(result.guidance[0]).toContain('uppercase');
  });

  it('aggregates multiple violations in the summary', () => {
    const result = evaluatePasswordPolicy('SHORTPASS7');

    expect(result.isValid).toBe(false);
    expect(result.failedRequirements.map((req) => req.id)).toEqual([
      'minLength',
      'lowercase',
      'symbol',
    ]);
    expect(result.summary).toContain(
      `${PASSWORD_POLICY_MIN_LENGTH} characters`,
    );
    expect(result.summary).toContain('a lowercase letter');
    expect(result.summary).toContain('a symbol');
  });

  it('allows legacy users to continue during the grace period', () => {
    const result = evaluatePasswordPolicy('legacyweakpass1', {
      legacy: {
        isLegacyUser: true,
        gracePeriodEndsAt: new Date('2025-04-01T00:00:00.000Z'),
        now: legacyNow,
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.canContinue).toBe(true);
    expect(result.legacy?.status).toBe('grace-period');
    expect(result.legacy?.message).toContain('reset it before');
    expect(result.legacy?.actionLabel).toBe('Reset password now');
  });

  it('requires a reset once the legacy grace period expires', () => {
    const result = evaluatePasswordPolicy('legacyweakpass1', {
      legacy: {
        isLegacyUser: true,
        gracePeriodEndsAt: new Date('2025-02-01T00:00:00.000Z'),
        now: legacyNow,
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.canContinue).toBe(false);
    expect(result.legacy?.status).toBe('reset-required');
    expect(result.legacy?.message).toContain('reset your password');
    expect(result.legacy?.actionLabel).toBe('Reset password to continue');
  });

  it('acknowledges legacy users that already comply with the policy', () => {
    const result = evaluatePasswordPolicy('AlreadyCompliant1!', {
      legacy: {
        isLegacyUser: true,
        gracePeriodEndsAt: new Date('2025-05-01T00:00:00.000Z'),
        now: legacyNow,
      },
    });

    expect(result.isValid).toBe(true);
    expect(result.canContinue).toBe(true);
    expect(result.legacy?.status).toBe('compliant');
    expect(result.legacy?.message).toMatch(/thanks for updating/i);
  });
});
