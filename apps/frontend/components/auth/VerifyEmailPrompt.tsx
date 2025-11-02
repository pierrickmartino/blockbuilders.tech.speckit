'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import type { FormEvent } from 'react';

import { useAuthStatus } from './AuthStatusToaster';

interface VerifyEmailPromptProps {
  initialEmail?: string | null;
  csrfEndpoint?: string;
  actionEndpoint?: string;
}

interface VerifyResponse {
  status: 'queued' | 'sent';
}

interface ErrorResponse {
  message: string;
}

const DEFAULT_CSRF_ENDPOINT = '/api/auth/csrf';
const DEFAULT_ACTION_ENDPOINT = '/api/auth/verify/resend';

export const VerifyEmailPrompt = ({
  initialEmail,
  csrfEndpoint = DEFAULT_CSRF_ENDPOINT,
  actionEndpoint = DEFAULT_ACTION_ENDPOINT,
}: VerifyEmailPromptProps) => {
  const { notify } = useAuthStatus();
  const [email, setEmail] = useState(initialEmail ?? '');
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState(() => crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingToken, setIsFetchingToken] = useState(true);
  const [hasSent, setHasSent] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const loadCsrfToken = useCallback(async () => {
    setIsFetchingToken(true);
    try {
      const response = await fetch(csrfEndpoint, {
        method: 'GET',
        headers: {
          'cache-control': 'no-store',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const payload = (await response.json()) as { token?: string };
      setCsrfToken(payload.token ?? null);
    } catch (error) {
      console.error(error);
      setCsrfToken(null);
      const failureMessage =
        'We could not start a secure session. Refresh the page and try again.';
      setLastMessage(failureMessage);
      notify({
        status: 'error',
        message: failureMessage,
      });
    } finally {
      setIsFetchingToken(false);
    }
  }, [csrfEndpoint, notify]);

  useEffect(() => {
    void loadCsrfToken();
  }, [loadCsrfToken]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || isFetchingToken) {
      return;
    }
    if (!csrfToken) {
      const failureMessage =
        'We could not verify your request. Refresh the page and try again.';
      setLastMessage(failureMessage);
      notify({
        status: 'error',
        message: failureMessage,
      });
      return;
    }

    setIsSubmitting(true);
    setLastMessage(null);
    const currentSubmission = submissionId;

    try {
      const response = await fetch(actionEndpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': csrfToken,
          'x-idempotency-key': currentSubmission,
        },
        body: JSON.stringify({
          email,
          csrfToken,
          submissionId: currentSubmission,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as ErrorResponse;
        const message =
          payload?.message ??
          'We could not resend the verification email. Try again shortly.';
        setLastMessage(message);
        notify({
          status: 'error',
          message,
        });
        return;
      }

      const payload = (await response.json()) as VerifyResponse;
      const message =
        payload.status === 'sent'
          ? 'Verification email sent! Check your inbox for the latest link.'
          : 'Verification email queued. Check your inbox shortly.';

      setHasSent(true);
      setLastMessage(message);
      notify({
        status: 'success',
        message,
      });

      startTransition(() => {
        setSubmissionId(crypto.randomUUID());
      });
    } catch (error) {
      console.error(error);
      const message =
        'We hit a network issue while resending the email. Please try again in a moment.';
      setLastMessage(message);
      notify({
        status: 'error',
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="verification-email">
          Email address
        </label>
        <input
          id="verification-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          autoComplete="email"
        />
      </div>

      {lastMessage ? (
        <p
          role="status"
          className={`rounded-md border px-3 py-2 text-sm ${
            hasSent
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {lastMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!email || isSubmitting || isFetchingToken}
        className="flex w-full items-center justify-center rounded-md bg-brand-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
            Sending…
          </span>
        ) : hasSent ? (
          'Resend again'
        ) : (
          'Resend verification email'
        )}
      </button>
    </form>
  );
};
