import { describe, expect, it } from 'vitest';

import { getForwardableSupabaseHeaders } from '@/lib/supabase/headers';

describe('getForwardableSupabaseHeaders', () => {
  it('keeps only allowlisted forwarding headers', () => {
    const headers = new Headers({
      'X-Forwarded-For': ' 203.0.113.10 ',
      'X-Forwarded-Proto': ' https ',
      Connection: 'keep-alive',
      Host: 'app.local',
    });

    expect(getForwardableSupabaseHeaders(headers)).toEqual({
      'x-forwarded-for': '203.0.113.10',
      'x-forwarded-proto': 'https',
    });
  });

  it('returns undefined when no forwarding headers are present', () => {
    const headers = new Headers({ Origin: 'https://app.local' });

    expect(getForwardableSupabaseHeaders(headers)).toBeUndefined();
  });

  it('normalizes different header input shapes', () => {
    const tupleHeaders: Array<[string, string]> = [
      ['x-forwarded-host', 'example.com'],
      ['x-forwarded-port', ' 443 '],
      ['x-forwarded-port', '8443'],
    ];

    expect(getForwardableSupabaseHeaders(tupleHeaders)).toEqual({
      'x-forwarded-host': 'example.com',
      'x-forwarded-port': '8443',
    });
  });
});
