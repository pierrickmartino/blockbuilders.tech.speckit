import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { createMiddlewareSupabaseCookies } from '@/lib/supabase/cookies';
import { getServerSupabaseConfig } from '@/lib/supabase/env';

const PROTECTED_PATH_PREFIXES = ['/dashboard'];

const isProtectedRoute = (pathname: string) =>
  PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const isRetryableAuthError = (error: unknown): error is { __isAuthError?: boolean } =>
  Boolean(
    error &&
      typeof error === 'object' &&
      '__isAuthError' in error &&
      (error as { __isAuthError?: boolean }).__isAuthError,
  );

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  try {
    const { url, anonKey } = getServerSupabaseConfig();
    const headerRecord = Object.fromEntries(request.headers.entries());
    const supabase = createServerClient(url, anonKey, {
      cookies: createMiddlewareSupabaseCookies({
        request: request.cookies,
        response: response.cookies,
      }),
      global: { headers: headerRecord },
    });

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    let resolvedUser = session?.user ?? null;
    try {
      const userResult = await supabase.auth.getUser();
      resolvedUser = userResult.data.user ?? resolvedUser;
    } catch (error) {
      if (!isRetryableAuthError(error)) {
        throw error;
      }
      // Retryable fetch errors (ex. middleware edge runtime networking) fall back to session data.
    }

    if (!resolvedUser || !resolvedUser.email_confirmed_at) {
      const redirectUrl = new URL('/auth/sign-in', request.url);
      redirectUrl.searchParams.set('returnTo', pathname);
      redirectUrl.searchParams.set(
        'reason',
        resolvedUser ? 'email-unverified' : 'unauthenticated',
      );
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  } catch (error) {
    console.error('[middleware] Supabase session validation failed', error);
    const redirectUrl = new URL('/auth/sign-in', request.url);
    redirectUrl.searchParams.set('returnTo', pathname);
    redirectUrl.searchParams.set('reason', 'session-error');
    return NextResponse.redirect(redirectUrl);
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
