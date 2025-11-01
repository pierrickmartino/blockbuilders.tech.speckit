import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  getBrowserSupabaseConfig,
  getServerSupabaseConfig,
  resetSupabaseEnvCache,
} from '@/lib/supabase/env';

const ORIGINAL_ENV = { ...process.env };
const MUTATED_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
] as const;

describe('Supabase env schema helper', () => {
  beforeEach(() => {
    resetSupabaseEnvCache();
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      'https://example-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_URL = 'https://secure-project.supabase.co';
  });

  afterEach(() => {
    resetSupabaseEnvCache();
    for (const key of MUTATED_KEYS) {
      if (ORIGINAL_ENV[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = ORIGINAL_ENV[key]!;
      }
    }
  });

  it('returns sanitized config for browser and server clients when vars exist', () => {
    const browserConfig = getBrowserSupabaseConfig();
    const serverConfig = getServerSupabaseConfig();

    expect(browserConfig).toEqual({
      url: 'https://example-project.supabase.co',
      anonKey: 'anon-key',
    });
    expect(serverConfig).toEqual({
      url: 'https://secure-project.supabase.co',
      anonKey: 'anon-key',
    });
  });

  it('falls back to the public URL when SUPABASE_URL is missing', () => {
    delete process.env.SUPABASE_URL;

    const serverConfig = getServerSupabaseConfig();

    expect(serverConfig.url).toBe('https://example-project.supabase.co');
    expect(serverConfig.anonKey).toBe('anon-key');
  });

  it('throws a descriptive error when required values are absent', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => getBrowserSupabaseConfig()).toThrowError(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY/i,
    );
  });

  it('caches validated values to avoid repeated parsing', () => {
    const first = getBrowserSupabaseConfig();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mutated.supabase.co';

    const second = getBrowserSupabaseConfig();

    expect(second).toBe(first);
  });
});
