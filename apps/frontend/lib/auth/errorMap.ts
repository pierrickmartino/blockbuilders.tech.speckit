export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_already_exists'
  | 'rate_limit_exceeded'
  | 'password_policy_violation'
  | 'invalid_csrf_token'
  | 'duplicate_submission'
  | 'unknown';

export interface AuthErrorPayload {
  code: AuthErrorCode;
  message: string;
  status: number;
}

type SupabaseError = {
  code?: string | null;
  message?: string | null;
  status?: number | null;
};

const DEFAULT_ERROR: AuthErrorPayload = {
  code: 'unknown',
  message:
    'Something went wrong while processing your request. Please try again or contact support if the problem persists.',
  status: 500,
};

const ERROR_MAP: Record<
  string,
  {
    code: AuthErrorCode;
    message: string;
    status: number;
  }
> = {
  // Supabase returns `invalid_credentials` for mismatched email/password.
  invalid_credentials: {
    code: 'invalid_credentials',
    message: 'That email and password combination is not correct. Please try again.',
    status: 401,
  },
  // When email confirmation is required the GoTrue API surfaces `email_not_confirmed`.
  email_not_confirmed: {
    code: 'email_not_confirmed',
    message:
      'Thanks for signing up! Please verify your email to finish activating your account.',
    status: 403,
  },
  user_already_exists: {
    code: 'user_already_exists',
    message: 'An account with that email already exists. Try signing in instead.',
    status: 409,
  },
  user_already_registered: {
    code: 'user_already_exists',
    message: 'An account with that email already exists. Try signing in instead.',
    status: 409,
  },
  weak_password: {
    code: 'password_policy_violation',
    message:
      'Passwords must be at least 12 characters and include uppercase, lowercase, number, and symbol.',
    status: 400,
  },
  password_policy_violation: {
    code: 'password_policy_violation',
    message:
      'Passwords must be at least 12 characters and include uppercase, lowercase, number, and symbol.',
    status: 400,
  },
  rate_limit_exceeded: {
    code: 'rate_limit_exceeded',
    message:
      'Too many attempts right now. Please wait a moment before trying again.',
    status: 429,
  },
};

export const mapSupabaseAuthError = (error: SupabaseError | null | undefined): AuthErrorPayload => {
  if (!error) {
    return DEFAULT_ERROR;
  }

  const normalizedCode =
    (typeof error.code === 'string' && error.code.trim().toLowerCase()) || '';

  if (normalizedCode && ERROR_MAP[normalizedCode]) {
    return ERROR_MAP[normalizedCode];
  }

  if (typeof error.status === 'number' && error.status >= 400 && error.status < 500) {
    return {
      code: 'unknown',
      message: error.message?.trim() || DEFAULT_ERROR.message,
      status: error.status,
    };
  }

  return {
    ...DEFAULT_ERROR,
    message: error.message?.trim() || DEFAULT_ERROR.message,
  };
};

export const buildClientError = (
  code: AuthErrorCode,
  message: string,
  status = 400,
): AuthErrorPayload => ({
  code,
  message,
  status,
});
