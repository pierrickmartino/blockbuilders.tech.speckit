import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { createMiddlewareSupabaseCookies } from '@/lib/supabase/cookies';
import { getServerSupabaseConfig } from '@/lib/supabase/env';

const PROTECTED_PATH_PREFIXES = ['/dashboard'];

const isProtectedRoute = (pathname: string) =>
  PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

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
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user || !user.email_confirmed_at) {
      const redirectUrl = new URL('/auth/sign-in', request.url);
      redirectUrl.searchParams.set('returnTo', pathname);
      redirectUrl.searchParams.set(
        'reason',
        user ? 'email-unverified' : 'unauthenticated',
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
