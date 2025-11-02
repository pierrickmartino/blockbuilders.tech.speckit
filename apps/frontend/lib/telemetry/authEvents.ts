import type { ZodError } from 'zod';

type AuthEventName = 'auth.sign_in' | 'auth.sign_out';
type AuthEventOutcome = 'success' | 'failure';
type AuthEventSurface = 'api_route' | 'client';

export interface AuthTelemetryEvent {
  event: AuthEventName;
  outcome: AuthEventOutcome;
  timestamp: string;
  correlationId: string;
  channel: 'frontend';
  context: {
    flow: string;
    surface: AuthEventSurface;
    route?: string;
  };
  identifiers: {
    emailHash?: string;
    userIdHash?: string;
  };
  metadata?: Record<string, unknown>;
  error?: {
    code: string;
    reason?: string;
  };
  pii: 'redacted';
}

export type AuthTelemetrySink = (event: AuthTelemetryEvent) => void;

const DEFAULT_EVENT_CHANNEL = 'speckit:auth-telemetry';
const DEFAULT_FLOW = 'email_password';

const defaultSink: AuthTelemetrySink = (event) => {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(DEFAULT_EVENT_CHANNEL, { detail: event }));
  }
};

let activeSink: AuthTelemetrySink = defaultSink;

const fnv1aHash = (value: string): string => {
  let hash = 0x811c9dc5;

  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

const sanitizeRoute = (route?: string | null): string | undefined => {
  if (!route) {
    return undefined;
  }

  try {
    const url = new URL(route, 'https://example.com');
    return url.pathname;
  } catch {
    return route.startsWith('/') ? route : undefined;
  }
};

const normalizeCorrelationId = (correlationId?: string): string => {
  if (correlationId) {
    return correlationId;
  }

  const cryptoApi =
    typeof globalThis !== 'undefined'
      ? (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
      : undefined;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  return `cid-${Math.random().toString(16).slice(2, 10)}`;
};

const resolveSurface = (surface?: AuthEventSurface): AuthEventSurface => {
  if (surface) {
    return surface;
  }

  return typeof window === 'undefined' ? 'api_route' : 'client';
};

const redactIdentifier = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }

  return fnv1aHash(value.trim().toLowerCase());
};

const toTimestamp = (timestamp?: Date | string): string => {
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  if (typeof timestamp === 'string') {
    return timestamp;
  }

  return new Date().toISOString();
};

interface CommonAuthEventOptions {
  correlationId?: string;
  route?: string | null;
  surface?: AuthEventSurface;
  flow?: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date | string;
}

interface AuthIdentifierOptions {
  email?: string | null;
  userId?: string | null;
}

interface AuthErrorOptions {
  errorCode?: string | null;
  errorReason?: string | ZodError | null;
}

export type AuthSignInEventOptions = CommonAuthEventOptions &
  AuthIdentifierOptions &
  AuthErrorOptions & {
    outcome: AuthEventOutcome;
  };

export type AuthSignOutEventOptions = CommonAuthEventOptions &
  AuthIdentifierOptions &
  AuthErrorOptions & {
    outcome: AuthEventOutcome;
  };

const normalizeError = (
  options: AuthErrorOptions,
): AuthTelemetryEvent['error'] | undefined => {
  if (!options.errorCode) {
    return undefined;
  }

  const reason =
    typeof options.errorReason === 'string'
      ? options.errorReason
      : options.errorReason?.message;

  return {
    code: options.errorCode,
    reason,
  };
};

const emit = (event: AuthTelemetryEvent): void => {
  activeSink(event);
};

const buildEvent = (
  eventName: AuthEventName,
  options: CommonAuthEventOptions & AuthIdentifierOptions & AuthErrorOptions & { outcome: AuthEventOutcome },
): AuthTelemetryEvent => ({
  event: eventName,
  outcome: options.outcome,
  timestamp: toTimestamp(options.timestamp),
  correlationId: normalizeCorrelationId(options.correlationId),
  channel: 'frontend',
  context: {
    flow: options.flow ?? DEFAULT_FLOW,
    surface: resolveSurface(options.surface),
    route: sanitizeRoute(options.route),
  },
  identifiers: {
    emailHash: redactIdentifier(options.email),
    userIdHash: redactIdentifier(options.userId),
  },
  metadata: options.metadata,
  error: normalizeError(options),
  pii: 'redacted',
});

export const emitAuthSignInEvent = (options: AuthSignInEventOptions): void => {
  emit(buildEvent('auth.sign_in', options));
};

export const emitAuthSignOutEvent = (options: AuthSignOutEventOptions): void => {
  emit(buildEvent('auth.sign_out', options));
};

export const setAuthTelemetrySink = (sink: AuthTelemetrySink | null): void => {
  activeSink = sink ?? defaultSink;
};

export const resetAuthTelemetrySink = (): void => {
  activeSink = defaultSink;
};
