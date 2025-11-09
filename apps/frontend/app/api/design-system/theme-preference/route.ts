import { NextResponse } from 'next/server';
import { cookies as nextCookies, headers as nextHeaders } from 'next/headers';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/clients';
import type { CookieStoreAdapter } from '@/lib/supabase/cookies';
import type { ThemeMode } from '@/lib/design-system/theme';

const ModeSchema = z.enum(['system', 'light', 'dark']);

const cookieNameFor = (userId: string) => `bb.theme-preference.${userId}`;

const createJsonResponse = (mode: ThemeMode, source: 'cookie' | 'fallback') =>
  NextResponse.json(
    {
      mode,
      source,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        'cache-control': 'no-store',
      },
    },
  );

const resolveContext = async () => {
  const rawCookies = await nextCookies();
  const cookieAdapter = rawCookies as unknown as CookieStoreAdapter;
  const headerStore = await nextHeaders();
  const supabase = createServerSupabaseClient({
    cookies: cookieAdapter,
    headers: headerStore,
  });

  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id ?? 'anonymous';
  return { rawCookies, userId };
};

export async function GET() {
  const { rawCookies, userId } = await resolveContext();
  const preferenceKey = cookieNameFor(userId);
  const rawPreference = rawCookies.get(preferenceKey)?.value;
  const result = ModeSchema.safeParse(rawPreference);
  const mode = result.success ? result.data : 'system';
  const source = result.success ? 'cookie' : 'fallback';

  return createJsonResponse(mode, source);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const payload = ModeSchema.parse(body?.mode);
    const { userId } = await resolveContext();
    const preferenceKey = cookieNameFor(userId);

    const response = createJsonResponse(payload, 'cookie');
    response.cookies.set(preferenceKey, payload, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'invalid_mode',
          message: 'Theme mode must be system, light, or dark.',
        },
        {
          status: 400,
          headers: {
            'cache-control': 'no-store',
          },
        },
      );
    }

    console.error('[theme-preference] Failed to persist preference', error);
    return NextResponse.json(
      {
        error: 'preference_persist_failed',
        message: 'Unable to persist theme preference right now.',
      },
      {
        status: 500,
        headers: {
          'cache-control': 'no-store',
        },
      },
    );
  }
}
