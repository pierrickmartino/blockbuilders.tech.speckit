import { cookies as nextCookies, headers as nextHeaders } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { buildClientError, mapSupabaseAuthError } from '@/lib/auth/errorMap';
import { extractCsrfToken, validateCsrfToken } from '@/lib/auth/csrf';
import { registerSubmission } from '@/lib/auth/submissionGuard';
import { createServerSupabaseClient } from '@/lib/supabase/clients';
import { adaptToCookieStore } from '@/lib/supabase/cookies';
import { toAuthSession } from '@/lib/auth/session';

const signUpRequestSchema = z
  .object({
    email: z
      .string({
        required_error: 'Email is required.',
      })
      .email('Enter a valid email address.'),
    password: z
      .string({
        required_error: 'Password is required.',
      })
      .min(12, 'Password must be at least 12 characters.'),
    redirectTo: z.string().url().optional(),
    submissionId: z.string().optional(),
    csrfToken: z.string().optional(),
  })
  .passthrough();

const jsonResponse = (payload: unknown, status = 200) =>
  new NextResponse(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });

export async function POST(request: Request) {
  const cookieStore = adaptToCookieStore(await nextCookies());
  const headerStore = await nextHeaders();
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse(
      buildClientError(
        'unknown',
        'Request payload is not valid JSON. Please try again.',
        400,
      ),
      400,
    );
  }

  const parseResult = signUpRequestSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return jsonResponse(
      buildClientError(
        'password_policy_violation',
        parseResult.error.issues[0]?.message ??
          'Please double-check the information you entered.',
        400,
      ),
      400,
    );
  }

  const csrfToken = await extractCsrfToken(request, rawBody);
  if (!(await validateCsrfToken(csrfToken))) {
    return jsonResponse(
      buildClientError(
        'invalid_csrf_token',
        'We could not verify your request. Refresh the page and try again.',
        403,
      ),
      403,
    );
  }

  const submissionKey =
    parseResult.data.submissionId ??
    request.headers.get('x-idempotency-key') ??
    request.headers.get('x-request-id');

  if (!registerSubmission(submissionKey)) {
    return jsonResponse(
      buildClientError(
        'duplicate_submission',
        'Hold on—we already received that request. If this keeps happening, refresh and try again.',
        409,
      ),
      409,
    );
  }

  const supabase = createServerSupabaseClient({
    cookies: cookieStore,
    headers: headerStore,
  });

  const { email, password, redirectTo } = parseResult.data;

  const response = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (response.error) {
    const error = mapSupabaseAuthError(response.error);
    return jsonResponse(
      {
        code: error.code,
        message: error.message,
      },
      error.status,
    );
  }

  return jsonResponse(
    {
      session: toAuthSession(response.data.session),
      user: response.data.user,
    },
    response.data.session ? 201 : 202,
  );
}
