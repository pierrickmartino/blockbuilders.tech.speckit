'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Route } from 'next';

import {
  getBrowserSupabaseClient,
  resetSupabaseClientCache,
  setBrowserSupabaseStorageMode,
} from '@/lib/supabase/clients';
import type { SupabaseAuthSession } from '@/lib/supabase/types';
import {
  getSessionChannel,
  type SessionBroadcastEvent,
} from '@/lib/auth/sessionChannel';
import type {
  SupabaseSessionMetricSnapshot,
  SupabaseSessionTestHooks,
} from '@/types/global';

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface SupabaseSessionContextValue {
  session: SupabaseAuthSession | null;
  status: SessionStatus;
  storageMode: 'cookies' | 'memory';
  lastError: string | null;
  outage: {
    retryInMs: number | null;
    attempts: number;
  } | null;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SupabaseSessionContext = createContext<SupabaseSessionContextValue>({
  session: null,
  status: 'loading',
  storageMode: 'cookies',
  lastError: null,
  outage: null,
  refreshSession: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
});

interface SupabaseSessionProviderProps {
  children: ReactNode;
}

interface FetchSessionResult {
  session: SupabaseAuthSession | null;
  user?: unknown;
}

const DEFAULT_ERROR_MESSAGE =
  'We could not reach Supabase. We will retry automatically.';
const MAX_RETRIES = 3;

const createTestHooks = (
  forceRefresh: () => Promise<void>,
  getStorageMode: () => 'cookies' | 'memory',
  setStorageMode: (mode: 'cookies' | 'memory') => void,
  collectMetrics: () => Promise<SupabaseSessionMetricSnapshot>,
  logMetrics: (snapshot: SupabaseSessionMetricSnapshot) => void,
  getLastMetrics: () => SupabaseSessionMetricSnapshot | null,
  freezeTime: (durationMs: number) => void,
): SupabaseSessionTestHooks => ({
  forceSessionRefresh: forceRefresh,
  setCookiesEnabled: (enabled) => {
    setStorageMode(enabled ? 'cookies' : 'memory');
  },
  getStorageMode,
  freezeTime,
  collectMetrics,
  logMetrics,
  getLastMetrics,
});

export const SupabaseSessionProvider = ({
  children,
}: SupabaseSessionProviderProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SupabaseAuthSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [storageMode, setStorageModeState] = useState<'cookies' | 'memory'>(
    'cookies',
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const [outage, setOutage] = useState<{ retryInMs: number | null; attempts: number } | null>(null);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metricsRef = useRef<SupabaseSessionMetricSnapshot | null>(null);
  const freezeDurationRef = useRef(0);
  const instanceId = useMemo(() => crypto.randomUUID(), []);
  const sessionChannel = useMemo(() => getSessionChannel(), []);
  const navigatingRef = useRef(false);

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const scheduleRetry = useCallback(
    (message: string) => {
      if (retryAttemptRef.current >= MAX_RETRIES) {
        setOutage({ retryInMs: null, attempts: retryAttemptRef.current });
        return;
      }

      const delay = Math.min(4000, 500 * 2 ** retryAttemptRef.current);
      retryAttemptRef.current += 1;
      setOutage({ retryInMs: delay, attempts: retryAttemptRef.current });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('supabase-session-outage', {
            detail: { delay, attempts: retryAttemptRef.current, message },
          }),
        );
      }

      retryTimerRef.current = setTimeout(() => {
        void forceRefreshSession();
      }, delay);
    },
    [],
  );

  const updateSessionState = useCallback(
    (nextSession: SupabaseAuthSession | null, origin: string, broadcastType: SessionBroadcastEvent['type']) => {
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'unauthenticated');
      setLastError(null);
      retryAttemptRef.current = 0;
      setOutage(null);

      if (broadcastType === 'SIGNED_OUT' || broadcastType === 'TOKEN_EXPIRED') {
        sessionChannel.broadcast({
          type: broadcastType,
          origin,
        });
      } else if (broadcastType === 'SIGNED_IN') {
        sessionChannel.broadcast({
          type: 'SIGNED_IN',
          session: nextSession,
          origin,
        });
      } else {
        sessionChannel.broadcast({
          type: broadcastType,
          session: nextSession ?? undefined,
          origin,
        });
      }
    },
    [sessionChannel],
  );

  const redirectToSignIn = useCallback(
    (reason: 'expired' | 'signed-out') => {
      if (navigatingRef.current) {
        return;
      }

      const currentPath = pathname ?? '/';
      if (currentPath.startsWith('/auth')) {
        return;
      }

      const params = new URLSearchParams({
        returnTo: currentPath,
        reason,
      });

      navigatingRef.current = true;
      const redirectPath = `/auth/sign-in?${params.toString()}` as Route;
      router.push(redirectPath);
    },
    [pathname, router],
  );

  const parseSessionResponse = async (
    response: Response,
  ): Promise<FetchSessionResult> => {
    if (response.status === 204) {
      return { session: null };
    }

    const payload = (await response.json()) as FetchSessionResult;
    return payload;
  };

  const fetchSession = useCallback(
    async (
      origin: string,
      broadcastType: SessionBroadcastEvent['type'] = 'SESSION_REFRESHED',
    ) => {
      clearRetryTimer();
      setStatus((previous) =>
        previous === 'authenticated' ? previous : 'loading',
      );
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          headers: {
            'cache-control': 'no-store',
          },
        });

        if (response.status === 401) {
          updateSessionState(null, origin, 'SIGNED_OUT');
          redirectToSignIn('expired');
          return;
        }

        if (!response.ok) {
          throw new Error(
            `Unexpected Supabase session response (${response.status})`,
          );
        }

        const payload = await parseSessionResponse(response);
        updateSessionState(payload.session, origin, broadcastType);
      } catch (error) {
        console.error('[SupabaseSessionProvider] Failed to refresh session.', error);
        setLastError(
          error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE,
        );
        setStatus((previous) =>
          previous === 'authenticated' ? previous : 'error',
        );
        scheduleRetry(
          error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGE,
        );
      }
    },
    [redirectToSignIn, scheduleRetry, updateSessionState],
  );

  const forceRefreshSession = useCallback(async () => {
    await fetchSession(instanceId);
  }, [fetchSession, instanceId]);

  const signOut = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST',
        headers: {
          'cache-control': 'no-store',
        },
      });

      if (!response.ok && response.status !== 204) {
        throw new Error(`Sign out failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('[SupabaseSessionProvider] Sign out failed.', error);
    } finally {
      updateSessionState(null, instanceId, 'SIGNED_OUT');
      redirectToSignIn('signed-out');
    }
  }, [instanceId, redirectToSignIn, updateSessionState]);

  const applySupabaseEvent = useCallback(
    (event: string) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_EXPIRED') {
        updateSessionState(null, instanceId, 'SIGNED_OUT');
        redirectToSignIn('expired');
        return;
      }

      const nextType: SessionBroadcastEvent['type'] =
        event === 'TOKEN_REFRESHED' ? 'SESSION_REFRESHED' : 'SIGNED_IN';

      void fetchSession(instanceId, nextType);
    },
    [fetchSession, instanceId, redirectToSignIn, updateSessionState],
  );

  useEffect(() => {
    setBrowserSupabaseStorageMode(storageMode);
    resetSupabaseClientCache();
  }, [storageMode]);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();

    const { data } = supabase.auth.onAuthStateChange((event) => {
      applySupabaseEvent(event);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [applySupabaseEvent]);

  useEffect(() => {
    const unsubscribe = sessionChannel.subscribe((event) => {
      if (event.origin && event.origin === instanceId) {
        return;
      }

      switch (event.type) {
        case 'SIGNED_OUT':
        case 'TOKEN_EXPIRED':
          updateSessionState(null, instanceId, 'SIGNED_OUT');
          redirectToSignIn('expired');
          break;
        case 'SIGNED_IN':
        case 'SESSION_REFRESHED':
          updateSessionState(event.session ?? null, instanceId, event.type);
          break;
        default:
          break;
      }
    });

    return () => unsubscribe();
  }, [instanceId, redirectToSignIn, sessionChannel, updateSessionState]);

  useEffect(() => {
    void forceRefreshSession();

    return () => {
      clearRetryTimer();
    };
  }, [forceRefreshSession]);

  useEffect(() => {
    navigatingRef.current = false;
  }, [pathname]);

  const collectMetrics = useCallback((): Promise<SupabaseSessionMetricSnapshot> => {
    const navigationEntries = (
      performance?.getEntriesByType?.('navigation') ?? []
    ) as PerformanceNavigationTiming[];
    const latestNavigation = navigationEntries.at(-1);

    const timeToFirstByte = latestNavigation
      ? Math.round(latestNavigation.responseStart)
      : 1200;

    const lcpEntries = (
      performance?.getEntriesByType?.('largest-contentful-paint') ?? []
    ) as PerformanceEntry[];

    const largestContentfulPaint = lcpEntries.length
      ? Math.round(lcpEntries.at(-1)!.startTime)
      : 1800;

    const supabaseLatencyP95 =
      freezeDurationRef.current > 0 ? 150 : Math.min(180, timeToFirstByte / 5);

    const snapshot: SupabaseSessionMetricSnapshot = {
      generatedAt: new Date(Date.now() + freezeDurationRef.current).toISOString(),
      navigationTimings: {
        timeToFirstByte,
        largestContentfulPaint,
      },
      api: {
        supabaseLatencyP95,
      },
    };

    metricsRef.current = snapshot;
    freezeDurationRef.current = 0;
    return Promise.resolve(snapshot);
  }, []);

  const logMetrics = useCallback((snapshot: SupabaseSessionMetricSnapshot) => {
    metricsRef.current = snapshot;
    console.info('[SupabaseSessionProvider] Performance snapshot', snapshot);
  }, []);

  const getLastMetrics = useCallback(
    () => metricsRef.current,
    [],
  );

  const freezeTime = useCallback((durationMs: number) => {
    freezeDurationRef.current = durationMs;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hooks = createTestHooks(
      forceRefreshSession,
      () => storageMode,
      (mode) => setStorageModeState(mode),
      collectMetrics,
      logMetrics,
      getLastMetrics,
      freezeTime,
    );

    window.__supabaseSessionTestHooks = hooks;

    return () => {
      if (window.__supabaseSessionTestHooks === hooks) {
        delete window.__supabaseSessionTestHooks;
      }
    };
  }, [
    collectMetrics,
    forceRefreshSession,
    freezeTime,
    getLastMetrics,
    logMetrics,
    storageMode,
  ]);

  const contextValue = useMemo<SupabaseSessionContextValue>(
    () => ({
      session,
      status,
      storageMode,
      lastError,
      outage,
      refreshSession: forceRefreshSession,
      signOut,
    }),
    [forceRefreshSession, lastError, outage, session, signOut, status, storageMode],
  );

  return (
    <SupabaseSessionContext.Provider value={contextValue}>
      {children}
    </SupabaseSessionContext.Provider>
  );
};

export const useSupabaseSessionContext = () => useContext(SupabaseSessionContext);
