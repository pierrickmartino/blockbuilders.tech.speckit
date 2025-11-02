import { cookies as nextCookies, headers as nextHeaders } from 'next/headers';
import { NextResponse } from 'next/server';

import { mapSupabaseAuthError } from '@/lib/auth/errorMap';
import { clearCsrfToken } from '@/lib/auth/csrf';
import { createServerSupabaseClient } from '@/lib/supabase/clients';
import type { CookieStoreAdapter } from '@/lib/supabase/cookies';
import { emitAuthSignOutEvent } from '@/lib/telemetry/authEvents';

export async function POST() {
  const cookieStore = (await nextCookies()) as unknown as CookieStoreAdapter;
  const headerStore = await nextHeaders();
  const supabase = createServerSupabaseClient({
    cookies: cookieStore,
    headers: headerStore,
  });

  const { error } = await supabase.auth.signOut();
  clearCsrfToken();

  if (error) {
    const payload = mapSupabaseAuthError(error);
    emitAuthSignOutEvent({
      outcome: 'failure',
      errorCode: payload.code,
      errorReason: payload.message,
      route: '/api/auth/sign-out',
      surface: 'api_route',
      metadata: {
        mechanism: 'password',
        status: payload.status,
      },
    });
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

  emitAuthSignOutEvent({
    outcome: 'success',
    route: '/api/auth/sign-out',
    surface: 'api_route',
    metadata: {
      mechanism: 'password',
    },
  });

  return new NextResponse(null, {
    status: 204,
    headers: {
      'cache-control': 'no-store',
    },
  });
}
