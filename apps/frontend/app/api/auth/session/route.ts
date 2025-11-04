import { cookies as nextCookies, headers as nextHeaders } from 'next/headers';
import { NextResponse } from 'next/server';

import { buildClientError, mapSupabaseAuthError } from '@/lib/auth/errorMap';
import { createServerSupabaseClient } from '@/lib/supabase/clients';
import type { CookieStoreAdapter } from '@/lib/supabase/cookies';
import { toAuthSession } from '@/lib/auth/session';

export async function GET() {
  const cookieStore = (await nextCookies()) as unknown as CookieStoreAdapter;
  const headerStore = await nextHeaders();
  const supabase = createServerSupabaseClient({
    cookies: cookieStore,
    headers: headerStore,
  });

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    const payload = mapSupabaseAuthError(error);
    return new NextResponse(
      JSON.stringify({
        code: payload.code,
        message: payload.message,
      }),
      {
        status: payload.status,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store',
        },
      },
    );
  }

  if (!data.session) {
    const payload = buildClientError(
      'invalid_credentials',
      'Authentication required. Please sign in to continue.',
      401,
    );
    return new NextResponse(
      JSON.stringify({
        code: payload.code,
        message: payload.message,
      }),
      {
        status: payload.status,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store',
        },
      },
    );
  }

  return new NextResponse(
    JSON.stringify({
      session: toAuthSession(data.session),
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    },
  );
}
