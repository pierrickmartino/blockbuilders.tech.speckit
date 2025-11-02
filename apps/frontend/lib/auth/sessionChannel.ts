import type { SupabaseAuthSession } from '@/lib/supabase/types';

export type SessionBroadcastEvent =
  | {
      type: 'SIGNED_IN';
      session: SupabaseAuthSession | null;
      origin?: string;
    }
  | {
      type: 'SESSION_REFRESHED';
      session?: SupabaseAuthSession | null;
      origin?: string;
    }
  | {
      type: 'SIGNED_OUT';
      origin?: string;
    }
  | {
      type: 'TOKEN_EXPIRED';
      origin?: string;
    };

export type SessionChannelListener = (event: SessionBroadcastEvent) => void;

export type SessionChannelMode = 'broadcast' | 'in-memory';

export interface SessionBroadcastChannel {
  readonly mode: SessionChannelMode;
  subscribe: (listener: SessionChannelListener) => () => void;
  broadcast: (event: SessionBroadcastEvent) => void;
  close: () => void;
}

export interface SessionChannelOptions {
  channelName?: string;
}

const DEFAULT_CHANNEL_NAME = 'bb.supabase.session';

const normalizeEvent = (payload: unknown): SessionBroadcastEvent | null => {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('type' in payload) ||
    typeof (payload as { type: unknown }).type !== 'string'
  ) {
    return null;
  }

  const event = payload as SessionBroadcastEvent;
  switch (event.type) {
    case 'SIGNED_IN':
    case 'SIGNED_OUT':
    case 'SESSION_REFRESHED':
    case 'TOKEN_EXPIRED':
      return event;
    default:
      return null;
  }
};

const createBroadcastChannel = (
  name: string,
): SessionBroadcastChannel => {
  const BroadcastChannelCtor =
    typeof globalThis !== 'undefined'
      ? (globalThis as { BroadcastChannel?: typeof BroadcastChannel }).BroadcastChannel
      : undefined;

  if (!BroadcastChannelCtor) {
    return createInMemoryChannel();
  }

  const channel = new BroadcastChannelCtor(name);
  const listeners = new Set<SessionChannelListener>();

  const handleMessage = (event: MessageEvent) => {
    const normalized = normalizeEvent(event.data);
    if (!normalized) {
      return;
    }
    for (const listener of [...listeners]) {
      listener(normalized);
    }
  };

  channel.addEventListener('message', handleMessage);

  return {
    mode: 'broadcast',
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    broadcast: (event) => {
      channel.postMessage(event);
    },
    close: () => {
      channel.removeEventListener('message', handleMessage);
      listeners.clear();
      channel.close();
    },
  };
};

const createInMemoryChannel = (): SessionBroadcastChannel => {
  const listeners = new Set<SessionChannelListener>();

  return {
    mode: 'in-memory',
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    broadcast: (event) => {
      for (const listener of [...listeners]) {
        listener(event);
      }
    },
    close: () => {
      listeners.clear();
    },
  };
};

let cachedChannel: SessionBroadcastChannel | null = null;
let cachedName = DEFAULT_CHANNEL_NAME;

export const getSessionChannel = (
  options?: SessionChannelOptions,
): SessionBroadcastChannel => {
  const desiredName = options?.channelName ?? DEFAULT_CHANNEL_NAME;

  if (cachedChannel && cachedName === desiredName) {
    return cachedChannel;
  }

  cachedChannel?.close();
  cachedChannel = createBroadcastChannel(desiredName);
  cachedName = desiredName;
  return cachedChannel;
};

export const resetSessionChannel = () => {
  cachedChannel?.close();
  cachedChannel = null;
  cachedName = DEFAULT_CHANNEL_NAME;
};
