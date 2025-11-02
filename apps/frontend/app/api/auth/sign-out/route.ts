import { cookies as nextCookies, headers as nextHeaders } from 'next/headers';
import { NextResponse } from 'next/server';

import { mapSupabaseAuthError } from '@/lib/auth/errorMap';
import { clearCsrfToken } from '@/lib/auth/csrf';
import { createServerSupabaseClient } from '@/lib/supabase/clients';

export async function POST() {
  const supabase = createServerSupabaseClient({
    cookies: nextCookies(),
    headers: nextHeaders(),
  });

  const { error } = await supabase.auth.signOut();
  clearCsrfToken();

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

  return new NextResponse(null, {
    status: 204,
    headers: {
      'cache-control': 'no-store',
    },
  });
}
