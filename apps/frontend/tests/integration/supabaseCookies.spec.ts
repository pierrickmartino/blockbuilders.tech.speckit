import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  SUPABASE_ACCESS_TOKEN_COOKIE,
  SUPABASE_REFRESH_TOKEN_COOKIE,
  createMiddlewareSupabaseCookies,
  createServerSupabaseCookies,
} from '@/lib/supabase/cookies';
import type { CookieStoreAdapter } from '@/lib/supabase/cookies';
import { resetSupabaseEnvCache } from '@/lib/supabase/env';

class MemoryRequestCookies {
  private readonly store = new Map<string, string>();

  setCalls: Array<{
    name: string;
    value: string;
    options?: Record<string, unknown>;
    action: 'set';
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
}

class MemoryResponseCookies {
  readonly setCalls: Array<{
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }> = [];

  set(name: string, value: string, options?: Record<string, unknown>) {
    this.setCalls.push({ name, value, options });
  }
}

describe('Supabase cookie adapters', () => {
  beforeEach(() => {
    resetSupabaseEnvCache();
  });

  afterEach(() => {
    resetSupabaseEnvCache();
  });

  it('keeps server and middleware cookie options in sync', () => {
    const serverCookies = new MemoryRequestCookies();
    const middlewareRequest = new MemoryRequestCookies();
    const middlewareResponse = new MemoryResponseCookies();

    const serverAdapter = createServerSupabaseCookies(
      serverCookies as unknown as CookieStoreAdapter,
    );
    const middlewareAdapter = createMiddlewareSupabaseCookies({
      request: middlewareRequest,
      response: middlewareResponse,
    } as Parameters<typeof createMiddlewareSupabaseCookies>[0]);

    serverAdapter.set(SUPABASE_ACCESS_TOKEN_COOKIE, 'token');
    middlewareAdapter.set(SUPABASE_ACCESS_TOKEN_COOKIE, 'token');

    expect(serverCookies.setCalls[0]).toBeDefined();
    expect(middlewareResponse.setCalls[0]).toBeDefined();
    expect(serverCookies.setCalls[0]?.options).toEqual(
      middlewareResponse.setCalls[0]?.options,
    );

    serverAdapter.remove(SUPABASE_ACCESS_TOKEN_COOKIE);
    middlewareAdapter.remove(SUPABASE_ACCESS_TOKEN_COOKIE);

    expect(serverCookies.setCalls[1]?.options).toEqual(
      middlewareResponse.setCalls[1]?.options,
    );
  });

  it('reads and writes refresh cookies consistently', () => {
    const serverCookies = new MemoryRequestCookies();
    const middlewareRequest = new MemoryRequestCookies();
    const middlewareResponse = new MemoryResponseCookies();

    const serverAdapter = createServerSupabaseCookies(
      serverCookies as unknown as CookieStoreAdapter,
    );
    const middlewareAdapter = createMiddlewareSupabaseCookies({
      request: middlewareRequest,
      response: middlewareResponse,
    } as Parameters<typeof createMiddlewareSupabaseCookies>[0]);

    serverAdapter.set(SUPABASE_REFRESH_TOKEN_COOKIE, 'server-refresh');
    middlewareAdapter.set(SUPABASE_REFRESH_TOKEN_COOKIE, 'middleware-refresh');

    expect(
      serverAdapter.get(SUPABASE_REFRESH_TOKEN_COOKIE),
    ).toBe('server-refresh');
    expect(
      middlewareAdapter.get(SUPABASE_REFRESH_TOKEN_COOKIE),
    ).toBe('middleware-refresh');

    expect(serverCookies.setCalls).toHaveLength(1);
    expect(middlewareResponse.setCalls).toHaveLength(1);
  });
});
