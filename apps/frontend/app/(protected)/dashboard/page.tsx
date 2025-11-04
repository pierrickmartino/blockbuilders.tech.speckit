'use client';

import { useCallback } from 'react';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { useSupabaseSession } from '@/lib/auth/useSupabaseSession';

export default function DashboardPage() {
  const {
    session,
    status,
    storageMode,
    lastError,
    outage,
    refreshSession,
  } = useSupabaseSession();

  const handleManualRefresh = useCallback(() => {
    void refreshSession();
  }, [refreshSession]);

  return (
    <div className="space-y-8 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg backdrop-blur">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-300">
            Signed in as
          </p>
          <p
            data-testid="protected-session-email"
            className="text-xl font-semibold text-white"
          >
            {session?.user.email ?? 'Unknown user'}
          </p>
        </div>
        <SignOutButton />
      </header>

      <section className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/10 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-300">
            Session state
          </p>
          <p className="mt-2 text-lg font-semibold text-white">{status}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/10 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-300">
            Storage mode
          </p>
          <p className="mt-2 text-lg font-semibold text-white">{storageMode}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/10 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-300">
            Next refresh attempt
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {outage?.retryInMs
              ? `${Math.round(outage.retryInMs / 100) / 10}s`
              : 'On demand'}
          </p>
        </div>
      </section>

      {lastError ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100"
        >
          <p className="font-semibold">Supabase outage detected</p>
          <p className="mt-2">
            {lastError} We will retry automatically. You can also try manually refreshing the session.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleManualRefresh}
          className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Refresh session
        </button>
        <span className="text-xs text-slate-300">
          Last refreshed:{' '}
          {session
            ? new Date(session.expires_at * 1000).toLocaleString()
            : 'N/A'}
        </span>
      </div>
    </div>
  );
}
