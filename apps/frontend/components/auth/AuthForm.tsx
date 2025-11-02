'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';

import { PASSWORD_POLICY_BULLET_POINTS, evaluatePasswordPolicy } from '@/lib/auth/passwordPolicy';
import { useAuthStatus } from './AuthStatusToaster';

type AuthMode = 'sign-up' | 'sign-in';

interface AuthFormProps {
  mode: AuthMode;
  redirectTo?: string | null;
  verifyRoute?: string;
  csrfEndpoint?: string;
}

interface AuthResponse {
  session: {
    email_confirmed: boolean;
  } | null;
  user?: {
    email_confirmed_at?: string | null;
  } | null;
}

interface AuthErrorResponse {
  code: string;
  message: string;
}

const DEFAULT_VERIFY_ROUTE = '/auth/verify';
const DEFAULT_CSRF_ENDPOINT = '/api/auth/csrf';

const buildActionUrl = (mode: AuthMode) =>
  mode === 'sign-up' ? '/api/auth/sign-up' : '/api/auth/sign-in';

const SubmissionStates = {
  Idle: 'idle',
  Loading: 'loading',
  Success: 'success',
  Error: 'error',
  Verification: 'verification-required',
} as const;

type SubmissionState = (typeof SubmissionStates)[keyof typeof SubmissionStates];

export const AuthForm = ({
  mode,
  redirectTo,
  verifyRoute = DEFAULT_VERIFY_ROUTE,
  csrfEndpoint = DEFAULT_CSRF_ENDPOINT,
}: AuthFormProps) => {
  const router = useRouter();
  const { notify } = useAuthStatus();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submissionState, setSubmissionState] = useState<SubmissionState>(SubmissionStates.Idle);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isFetchingCsrf, setIsFetchingCsrf] = useState(true);
  const [submissionId, setSubmissionId] = useState(() => crypto.randomUUID());
  const [isPending, startTransition] = useTransition();

  const passwordPolicy = useMemo(
    () => evaluatePasswordPolicy(password),
    [password],
  );

  const loadCsrfToken = useCallback(async () => {
    setIsFetchingCsrf(true);
    try {
      const response = await fetch(csrfEndpoint, {
        method: 'GET',
        headers: {
          'cache-control': 'no-store',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token.');
      }
      const payload = (await response.json()) as { token?: string };
      setCsrfToken(payload.token ?? null);
    } catch (error) {
      console.error(error);
      setSubmissionError('We could not start a secure session. Refresh the page and try again.');
      setCsrfToken(null);
    } finally {
      setIsFetchingCsrf(false);
    }
  }, [csrfEndpoint]);

  useEffect(() => {
    void loadCsrfToken();
  }, [loadCsrfToken]);

  const resetSubmissionState = () => {
    setSubmissionState(SubmissionStates.Idle);
    setSubmissionError(null);
  };

  useEffect(() => {
    if (submissionState === SubmissionStates.Error && submissionError) {
      notify({
        status: 'error',
        message: submissionError,
      });
    }
  }, [submissionError, submissionState, notify]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submissionState === SubmissionStates.Loading || isFetchingCsrf) {
      return;
    }

    if (!csrfToken) {
      setSubmissionError('We could not verify your request. Refresh and try again.');
      setSubmissionState(SubmissionStates.Error);
      return;
    }

    resetSubmissionState();

    setSubmissionState(SubmissionStates.Loading);

    const currentSubmissionId = submissionId;
    const payload = {
      email,
      password,
      redirectTo,
      csrfToken,
      submissionId: currentSubmissionId,
    };

    try {
      const response = await fetch(buildActionUrl(mode), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-idempotency-key': currentSubmissionId,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as AuthErrorResponse;
        const errorMessage =
          errorPayload?.message ??
          'Something went wrong while submitting the form. Please try again.';
        setSubmissionError(errorMessage);
        setSubmissionState(SubmissionStates.Error);
        notify({
          status: 'error',
          message: errorMessage,
        });
        return;
      }

      const responsePayload = (await response.json()) as AuthResponse;
      const requiresVerification =
        response.status === 202 ||
        !responsePayload.session ||
        !responsePayload.session.email_confirmed ||
        !responsePayload.user?.email_confirmed_at;

      if (requiresVerification && mode === 'sign-up') {
        setSubmissionState(SubmissionStates.Verification);
        notify({
          status: 'info',
          message:
            'Check your email to finish verifying your account. We’ll take you to the verification page.',
          redirect: verifyRoute,
        });
        startTransition(() => {
          router.push(verifyRoute as Route);
        });
        return;
      }

      setSubmissionState(SubmissionStates.Success);
      notify({
        status: 'success',
        message:
          mode === 'sign-up'
            ? 'Account created! Redirecting you to your workspace.'
            : 'Signed in successfully. Redirecting…',
      });
      startTransition(() => {
        const destination = (redirectTo ?? '/') as Parameters<
          typeof router.push
        >[0];
        router.push(destination);
      });
    } catch (error) {
      console.error(error);
      const errorMessage =
        'We could not reach the server. Check your connection and try again.';
      setSubmissionError(errorMessage);
      setSubmissionState(SubmissionStates.Error);
      notify({
        status: 'error',
        message: errorMessage,
      });
    } finally {
      setSubmissionId(crypto.randomUUID());
    }
  };

  const isSubmitDisabled =
    submissionState === SubmissionStates.Loading ||
    isFetchingCsrf ||
    !email ||
    !password ||
    (mode === 'sign-up' && !passwordPolicy.isValid);

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      aria-describedby={submissionError ? 'auth-form-error' : undefined}
    >
      <div>
        <label
          className="block text-sm font-medium text-slate-700"
          htmlFor="email"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
      </div>

      <div>
        <label
          className="block text-sm font-medium text-slate-700"
          htmlFor="password"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          aria-describedby={mode === 'sign-up' ? 'password-guidance' : undefined}
        />
        {mode === 'sign-up' ? (
          <ul
            id="password-guidance"
            className="mt-3 space-y-2 text-sm text-slate-600"
          >
            {PASSWORD_POLICY_BULLET_POINTS.map((requirement) => {
              const matched = passwordPolicy.requirements.find(
                ({ label }) => label === requirement,
              );
              const isMet = matched?.met ?? false;
              return (
                <li
                  key={requirement}
                  className={`flex items-center gap-2 ${isMet ? 'text-emerald-600' : 'text-slate-600'}`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                      isMet ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isMet ? '✓' : '•'}
                  </span>
                  {requirement}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {submissionError ? (
        <p
          id="auth-form-error"
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {submissionError}
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="flex w-full items-center justify-center rounded-md bg-brand-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submissionState === SubmissionStates.Loading || isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
              Processing…
            </span>
          ) : mode === 'sign-up' ? (
            'Create account'
          ) : (
            'Sign in'
          )}
        </button>
      </div>

      <p className="text-center text-xs text-slate-500" role="status" aria-live="polite">
        {submissionState === SubmissionStates.Loading
          ? 'Submitting your request…'
          : submissionState === SubmissionStates.Verification
            ? 'Check your email to verify your account.'
            : submissionState === SubmissionStates.Success
              ? 'Success! Redirecting…'
              : ''}
      </p>
    </form>
  );
};
