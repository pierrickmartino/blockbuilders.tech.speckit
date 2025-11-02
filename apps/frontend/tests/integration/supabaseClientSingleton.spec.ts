import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createServerSupabaseClient,
  getBrowserSupabaseClient,
  resetSupabaseClientCache,
} from '@/lib/supabase/clients';
import { resetSupabaseEnvCache } from '@/lib/supabase/env';

const ORIGINAL_ENV = { ...process.env };
const MUTATED_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
] as const;

const { mockBrowserFactory, mockServerFactory } = vi.hoisted(() => {
  return {
    mockBrowserFactory: vi.fn(
      (url: string, key: string, _options?: unknown) => ({
        kind: 'browser',
        url,
        key,
        instance: Symbol('browser'),
      }),
    ),
    mockServerFactory: vi.fn(
      (url: string, key: string, options: unknown) => ({
        kind: 'server',
        url,
        key,
        options,
        instance: Symbol('server'),
      }),
    ),
  };
});

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: mockBrowserFactory,
  createServerClient: mockServerFactory,
}));

class MemoryRequestCookies {
  private readonly store = new Map<string, string>();

  setCalls: Array<{
    name: string;
    value: string;
    options?: Record<string, unknown>;
    action: 'set' | 'delete';
  }> = [];

  get(name: string) {
    if (!this.store.has(name)) {
      return undefined;
    }
    return { name, value: this.store.get(name)! };
  }

  set(name: string, value: string, options?: Record<string, unknown>) {
    this.store.set(name, value);
    this.setCalls.push({ name, value, options, action: 'set' });
  }

  delete(name: string, options?: Record<string, unknown>) {
    this.store.delete(name);
    this.setCalls.push({ name, value: '', options, action: 'delete' });
  }
}

describe('Supabase client factories', () => {
  beforeEach(() => {
    resetSupabaseEnvCache();
    resetSupabaseClientCache();
    mockBrowserFactory.mockClear();
    mockServerFactory.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      'https://example-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_URL = 'https://secure-project.supabase.co';
  });

  afterEach(() => {
    resetSupabaseEnvCache();
    resetSupabaseClientCache();
    for (const key of MUTATED_KEYS) {
      if (ORIGINAL_ENV[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = ORIGINAL_ENV[key]!;
      }
    }
  });

  it('reuses a single browser client instance', () => {
    const first = getBrowserSupabaseClient();
    const second = getBrowserSupabaseClient();

    expect(first).toBe(second);
    expect(mockBrowserFactory).toHaveBeenCalledTimes(1);
  });

  it('creates one server client per request context', () => {
    const cookies = new MemoryRequestCookies();
    const headers = new Headers();

    const clientA = createServerSupabaseClient({ cookies, headers });
    const clientB = createServerSupabaseClient({ cookies, headers });

    expect(clientA).toBe(clientB);
    expect(mockServerFactory).toHaveBeenCalledTimes(1);
  });

  it('creates a new server client for different cookie stores', () => {
    const requestOne = new MemoryRequestCookies();
    const requestTwo = new MemoryRequestCookies();
    const headers = new Headers();

    const clientOne = createServerSupabaseClient({
      cookies: requestOne,
      headers,
    });
    const clientTwo = createServerSupabaseClient({
      cookies: requestTwo,
      headers,
    });

    expect(clientOne).not.toBe(clientTwo);
    expect(mockServerFactory).toHaveBeenCalledTimes(2);
  });

  it('passes validated env config to the factory', () => {
    const cookies = new MemoryRequestCookies();
    const headers = new Headers();

    createServerSupabaseClient({ cookies, headers });
    getBrowserSupabaseClient();

    const serverCall = mockServerFactory.mock.calls.at(-1);
    expect(serverCall).toBeDefined();
    const [serverUrl, serverKey, serverOptions] = serverCall ?? [];
    expect(serverUrl).toBe('https://secure-project.supabase.co');
    expect(serverKey).toBe('anon-key');
    expect(serverOptions && typeof serverOptions).toBe('object');
    const cookiesOption = (serverOptions as { cookies?: { get?: unknown } } | undefined)?.cookies;
    expect(cookiesOption).toBeDefined();
    expect(typeof cookiesOption?.get).toBe('function');

    const browserCall = mockBrowserFactory.mock.calls.at(-1);
    expect(browserCall).toBeDefined();
    const [browserUrl, browserKey, browserOptions] = browserCall ?? [];
    expect(browserUrl).toBe('https://example-project.supabase.co');
    expect(browserKey).toBe('anon-key');
    const authOptions = (browserOptions as {
      auth?: { persistSession?: unknown; detectSessionInUrl?: unknown };
    } | null)?.auth;
    expect(authOptions).toBeDefined();
    expect(authOptions?.persistSession).toBe(true);
    expect(authOptions?.detectSessionInUrl).toBe(true);
  });
});
