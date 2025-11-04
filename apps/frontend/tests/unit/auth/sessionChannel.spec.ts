import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SupabaseAuthSession } from '@/lib/supabase/types';
import {
  getSessionChannel,
  resetSessionChannel,
  type SessionBroadcastEvent,
} from '@/lib/auth/sessionChannel';

class FakeBroadcastChannel {
  static channels = new Map<string, Set<FakeBroadcastChannel>>();

  readonly name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  private isClosed = false;
  private readonly listeners = new Set<(event: MessageEvent) => void>();

  constructor(name: string) {
    this.name = name;
    const peers =
      FakeBroadcastChannel.channels.get(name) ?? new Set<FakeBroadcastChannel>();
    peers.add(this);
    FakeBroadcastChannel.channels.set(name, peers);
  }

  postMessage(data: unknown) {
    if (this.isClosed) {
      return;
    }

    const peers = FakeBroadcastChannel.channels.get(this.name);
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
    this.isClosed = true;
    const peers = FakeBroadcastChannel.channels.get(this.name);
    if (!peers) {
      return;
    }
    peers.delete(this);
    if (peers.size === 0) {
      FakeBroadcastChannel.channels.delete(this.name);
    }
  }
}

const sampleSession = (): SupabaseAuthSession => ({
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  email_confirmed: true,
  user: {
    id: 'a1111111-1111-1111-1111-111111111111',
    email: 'user@example.com',
    email_confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
  },
});

describe('sessionChannel', () => {
  beforeEach(() => {
    resetSessionChannel();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    FakeBroadcastChannel.channels.clear();
    resetSessionChannel();
  });

  it('broadcasts events across subscribers via the native channel', () => {
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);

    const events: SessionBroadcastEvent[] = [];

    const channel = getSessionChannel({ channelName: 'vitest-channel' });
    const unsubscribe = channel.subscribe((event) => {
      events.push(event);
    });

    const payload: SessionBroadcastEvent = {
      type: 'SIGNED_IN',
      session: sampleSession(),
      origin: 'test',
    };

    channel.broadcast(payload);

    expect(channel.mode).toBe('broadcast');
    expect(events).toHaveLength(1);
    expect(events[0]).toStrictEqual(payload);

    unsubscribe();
    channel.close();
  });

  it('falls back to in-memory signalling when BroadcastChannel is unavailable', () => {
    // Ensure global BroadcastChannel is undefined.
    // @ts-expect-error intentional removal for testing fallback behaviour
    globalThis.BroadcastChannel = undefined;

    const channel = getSessionChannel({ channelName: 'fallback-channel' });
    const events: SessionBroadcastEvent[] = [];

    const unsubscribe = channel.subscribe((event) => {
      events.push(event);
    });

    channel.broadcast({ type: 'SIGNED_OUT', origin: 'test' });

    expect(channel.mode).toBe('in-memory');
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'SIGNED_OUT', origin: 'test' });

    unsubscribe();
    channel.close();
  });

  it('resets subscribers when the channel is closed', () => {
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);

    const channel = getSessionChannel({ channelName: 'close-channel' });
    const events: SessionBroadcastEvent[] = [];

    const unsubscribe = channel.subscribe((event) => {
      events.push(event);
    });

    channel.close();

    channel.broadcast({ type: 'TOKEN_EXPIRED', origin: 'test' });

    expect(events).toHaveLength(0);

    unsubscribe();
  });
});
