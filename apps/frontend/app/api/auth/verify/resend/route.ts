import { cookies as nextCookies, headers as nextHeaders } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { buildClientError, mapSupabaseAuthError } from '@/lib/auth/errorMap';
import { extractCsrfToken, validateCsrfToken } from '@/lib/auth/csrf';
import { registerSubmission } from '@/lib/auth/submissionGuard';
import { createServerSupabaseClient } from '@/lib/supabase/clients';
import { adaptToCookieStore } from '@/lib/supabase/cookies';

const resendSchema = z
  .object({
    email: z
      .string({
        required_error: 'Email is required.',
      })
      .email('Enter a valid email address.'),
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

  const parseResult = resendSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return jsonResponse(
      buildClientError(
        'unknown',
        parseResult.error.issues[0]?.message ??
          'Please provide a valid email address to resend verification.',
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
        'That request is already processing. Try again in a moment if needed.',
        409,
      ),
      409,
    );
  }

  const cookieStore = adaptToCookieStore(await nextCookies());
  const headerStore = await nextHeaders();
  const supabase = createServerSupabaseClient({
    cookies: cookieStore,
    headers: headerStore,
  });

  const { email } = parseResult.data;
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });

  if (error) {
    const payload = mapSupabaseAuthError(error);
    return jsonResponse(
      {
        code: payload.code,
        message: payload.message,
      },
      payload.status,
    );
  }

  const metadata = data as { email_sent_at?: string | null; email_sent?: boolean } | null;
  const delivered = Boolean(metadata?.email_sent_at ?? metadata?.email_sent);

  return jsonResponse(
    {
      status: delivered ? 'sent' : 'queued',
    },
    200,
  );
}
