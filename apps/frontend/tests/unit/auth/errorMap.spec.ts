import { describe, expect, it } from 'vitest';

import {
  buildClientError,
  mapSupabaseAuthError,
} from '@/lib/auth/errorMap';

describe('mapSupabaseAuthError', () => {
  it('returns default error when payload missing', () => {
    const result = mapSupabaseAuthError(undefined);
    expect(result.code).toBe('unknown');
    expect(result.status).toBe(500);
    expect(result.message).toMatch(/something went wrong/i);
  });

  it('maps known Supabase error codes to friendly messages', () => {
    const result = mapSupabaseAuthError({
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
    });

    expect(result).toMatchObject({
      code: 'invalid_credentials',
      status: 401,
    });
    expect(result.message).toMatch(/not correct/i);
  });

  it('normalises duplicate user errors', () => {
    const result = mapSupabaseAuthError({
      code: 'user_already_registered',
      message: 'Duplicate',
    });

    expect(result.code).toBe('user_already_exists');
    expect(result.status).toBe(409);
  });

  it('falls back to server-provided message for 4xx statuses', () => {
    const result = mapSupabaseAuthError({
      status: 422,
      message: 'Invalid input',
    });

    expect(result.status).toBe(422);
    expect(result.message).toBe('Invalid input');
  });
});

describe('buildClientError', () => {
  it('creates the expected payload', () => {
    const result = buildClientError('invalid_csrf_token', 'refresh required', 403);

    expect(result).toEqual({
      code: 'invalid_csrf_token',
      message: 'refresh required',
      status: 403,
    });
  });
});
