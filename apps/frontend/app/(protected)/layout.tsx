import type { ReactNode } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Route } from 'next';

import { createServerSupabaseClient } from '@/lib/supabase/clients';
import type { CookieStoreAdapter } from '@/lib/supabase/cookies';

interface ProtectedLayoutProps {
  children: ReactNode;
}

const resolveReturnPath = (
  requestHeaders: { get: (name: string) => string | null | undefined },
): string =>
  requestHeaders.get('x-invoke-path') ??
  requestHeaders.get('x-middleware-request-url') ??
  '/dashboard';

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const cookieStore = (await cookies()) as unknown as CookieStoreAdapter;
  const headerStore = await headers();
  const supabase = createServerSupabaseClient({
    cookies: cookieStore,
    headers: headerStore,
  });

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session || !session.user.email_confirmed_at) {
    const returnTo = resolveReturnPath(headerStore);
    const reason = error
      ? 'session-error'
      : session
        ? 'email-unverified'
        : 'unauthenticated';
    redirect(
      `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}&reason=${reason}` as Route,
    );
  }

  return (
    <section className="bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-[60vh] max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col items-start justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">
              Authenticated workspace
            </p>
            <h1 className="text-3xl font-semibold text-white">
              Supabase session dashboard
            </h1>
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </section>
  );
}
