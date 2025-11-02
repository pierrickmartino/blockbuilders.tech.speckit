import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createServerSupabaseClient,
  getBrowserSupabaseClient,
  resetSupabaseClientCache,
} from '@/lib/supabase/clients';
import { resetSupabaseEnvCache } from '@/lib/supabase/env';
import {
  getSessionChannel,
  resetSessionChannel,
  type SessionBroadcastEvent,
} from '@/lib/auth/sessionChannel';

class MemoryRequestCookies {
  private readonly store = new Map<string, string>();

  setCalls: Array<{
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }> = [];

  get(name: string) {
    if (!this.store.has(name)) {
      return undefined;
    }
    return { value: this.store.get(name)! };
  }

  set(name: string, value: string, options?: Record<string, unknown>) {
    this.store.set(name, value);
    this.setCalls.push({ name, value, options });
  }
}

class FakeBroadcastChannel {
  static registry = new Map<string, Set<FakeBroadcastChannel>>();

  readonly name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  private readonly listeners = new Set<(event: MessageEvent) => void>();

  constructor(name: string) {
    this.name = name;
    const peers = FakeBroadcastChannel.registry.get(name) ?? new Set();
    peers.add(this);
    FakeBroadcastChannel.registry.set(name, peers);
  }

  postMessage(data: unknown) {
    const peers = FakeBroadcastChannel.registry.get(this.name);
    if (!peers) {
      return;
    }

    for (const peer of peers) {
      const event = { data } as MessageEvent;
      peer.onmessage?.(event);
      for (const listener of peer.listeners) {
        listener(event);
      }
    }
  }

  addEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ) {
    if (type !== 'message') {
      return;
    }
    this.listeners.add(listener);
  }

  removeEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ) {
    if (type !== 'message') {
      return;
    }
    this.listeners.delete(listener);
  }

  close() {
    const peers = FakeBroadcastChannel.registry.get(this.name);
    if (!peers) {
      return;
    }
    peers.delete(this);
    if (peers.size === 0) {
      FakeBroadcastChannel.registry.delete(this.name);
    }
  }
}

const ORIGINAL_ENV = { ...process.env };
const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
] as const;

const ENV_FIXTURES: Record<(typeof ENV_KEYS)[number], string> = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example-project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_URL: 'https://example-project.supabase.co',
};

const { mockBrowserFactory, mockServerFactory } = vi.hoisted(() => {
  return {
    mockBrowserFactory: vi.fn(
      (url: string, key: string) => ({
        scope: 'browser',
        url,
        key,
        instance: Symbol('browser'),
      }),
    ),
    mockServerFactory: vi.fn(
      (url: string, key: string, options: unknown) => ({
        scope: 'server',
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

describe('supabase session singleton behaviour', () => {
  beforeEach(() => {
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
    for (const key of ENV_KEYS) {
      process.env[key] ??= ENV_FIXTURES[key];
    }
    resetSupabaseEnvCache();
    resetSupabaseClientCache();
    resetSessionChannel();
    mockBrowserFactory.mockClear();
    mockServerFactory.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetSessionChannel();
    resetSupabaseClientCache();
    resetSupabaseEnvCache();
    for (const key of ENV_KEYS) {
      if (ORIGINAL_ENV[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = ORIGINAL_ENV[key]!;
      }
    }
  });

  it('reuses singleton instances per runtime and avoids leaking across requests', () => {
    const firstBrowser = getBrowserSupabaseClient();
    const secondBrowser = getBrowserSupabaseClient();

    expect(firstBrowser).toBe(secondBrowser);
    expect(mockBrowserFactory).toHaveBeenCalledTimes(1);

    const requestOne = new MemoryRequestCookies();
    const requestTwo = new MemoryRequestCookies();
    const headers = new Headers();

    const sessionChannel = getSessionChannel({ channelName: 'singleton' });
    const channelEvents: SessionBroadcastEvent[] = [];
    const unsubscribe = sessionChannel.subscribe((event) => {
      channelEvents.push(event);
    });

    const serverA = createServerSupabaseClient({ cookies: requestOne, headers });
    const serverB = createServerSupabaseClient({ cookies: requestOne, headers });
    const serverC = createServerSupabaseClient({ cookies: requestTwo, headers });

    expect(serverA).toBe(serverB);
    expect(serverA).not.toBe(serverC);
    expect(mockServerFactory).toHaveBeenCalledTimes(2);

    sessionChannel.broadcast({ type: 'SESSION_REFRESHED', origin: 'vitest' });

    expect(channelEvents).toEqual([
      { type: 'SESSION_REFRESHED', origin: 'vitest' },
    ]);
    expect(sessionChannel.mode).toBe('broadcast');

    unsubscribe();
    sessionChannel.close();
  });
});
