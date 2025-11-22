'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';

import { createServerSupabaseClient } from '@/lib/supabase/clients';
import type { CookieStoreAdapter } from '@/lib/supabase/cookies';

const REDIRECT_REASON = 'auth-check-required';

const sanitizeSessionForDisplay = (session: Session | null) => {
  if (!session) {
    return null;
  }

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token ?? null,
    expires_in: session.expires_in ?? null,
    expires_at: session.expires_at ?? null,
    token_type: session.token_type ?? null,
    provider_token: session.provider_token ?? null,
    provider_refresh_token: session.provider_refresh_token ?? null,
  };
};

export default async function AuthCheckPage() {
  const cookieStore = (await cookies()) as unknown as CookieStoreAdapter;
  const headerStore = await headers();
  const supabase = createServerSupabaseClient({
    cookies: cookieStore,
    headers: headerStore,
  });

  const [sessionResult, userResult] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);

  const sessionError = sessionResult.error;
  const userError = userResult.error;
  const session = sessionResult.data.session;
  const user = userResult.data.user;

  if (sessionError) {
    redirect(`/auth/sign-in?reason=session-error`);
  }

  if (userError || !user) {
    redirect(`/auth/sign-in?reason=${REDIRECT_REASON}`);
  }

  if (!session) {
    redirect(`/auth/sign-in?reason=unauthenticated`);
  }

  const {
    id,
    email,
    email_confirmed_at,
    user_metadata,
    app_metadata,
  } = user;

  const workspaceId =
    (typeof user_metadata?.workspace_id === 'string' && user_metadata.workspace_id) ||
    (typeof app_metadata?.workspace_id === 'string' && app_metadata.workspace_id) ||
    'missing from metadata';

  return (
    <section className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-white/10 bg-slate-950/60 px-8 py-12 text-slate-50">
      <header>
        <p className="text-xs uppercase tracking-widest text-slate-400">Authentication</p>
        <h1 className="text-3xl font-semibold text-white">Auth Check</h1>
        <p className="text-sm text-slate-300">
          This page lets you verify you have an active Supabase session. If you arrived here, authentication succeeded.
        </p>
      </header>
      <dl className="grid gap-4">
        <div>
          <dt className="text-xs uppercase tracking-widest text-slate-400">User ID</dt>
          <dd className="text-lg font-semibold text-white">{id}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-widest text-slate-400">Email</dt>
          <dd className="text-lg font-semibold text-white">{email ?? 'missing'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-widest text-slate-400">Workspace</dt>
          <dd className="text-lg font-semibold text-white">{workspaceId}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-widest text-slate-400">Email confirmed</dt>
          <dd className="text-lg font-semibold text-white">
            {email_confirmed_at ? new Date(email_confirmed_at).toLocaleString() : 'not confirmed'}
          </dd>
        </div>
      </dl>
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
        <p className="font-semibold text-white">Session payload</p>
        <pre className="mt-2 max-h-40 overflow-auto text-[0.9rem]">
          {JSON.stringify(sanitizeSessionForDisplay(session), null, 2)}
        </pre>
      </div>
    </section>
  );
}
