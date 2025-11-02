import { cookies as nextCookies } from 'next/headers';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const CSRF_COOKIE_NAME = 'sb-auth-csrf';
const CSRF_TOKEN_BYTES = 32;
const CSRF_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

const encodeToken = (token: Buffer): string => token.toString('base64url');

const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('base64url');

const buildCookieOptions = (maxAge = CSRF_TOKEN_TTL_SECONDS) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge,
});

export const issueCsrfToken = (): string => {
  const token = encodeToken(randomBytes(CSRF_TOKEN_BYTES));
  const hashedToken = hashToken(token);
  const cookieStore = nextCookies();
  cookieStore.set(CSRF_COOKIE_NAME, hashedToken, buildCookieOptions());
  return token;
};

export const clearCsrfToken = () => {
  const cookieStore = nextCookies();
  cookieStore.set(CSRF_COOKIE_NAME, '', buildCookieOptions(0));
};

export const validateCsrfToken = (providedToken: string | null | undefined): boolean => {
  if (!providedToken) {
    return false;
  }

  const cookieStore = nextCookies();
  const cookieValue = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieValue) {
    return false;
  }

  try {
    const expected = Buffer.from(cookieValue, 'base64url');
    const received = Buffer.from(hashToken(providedToken), 'base64url');
    if (expected.length !== received.length) {
      return false;
    }

    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
};

export const getCsrfTokenFromHeaders = (request: Request): string | null => {
  const requestHeaders = request.headers;
  const headerToken =
    requestHeaders.get('x-csrf-token') ?? requestHeaders.get('x-xsrf-token');
  if (headerToken) {
    return headerToken;
  }

  return null;
};

export const extractCsrfToken = async (
  request: Request,
  parsedBody?: unknown,
): Promise<string | null> => {
  const headerToken = getCsrfTokenFromHeaders(request);
  if (headerToken) {
    return headerToken;
  }

  if (parsedBody !== undefined) {
    if (parsedBody && typeof parsedBody === 'object') {
      const fromBody = (parsedBody as Record<string, unknown>).csrfToken;
      if (typeof fromBody === 'string') {
        return fromBody;
      }
    }
    return null;
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const body = await request.clone().json();
      if (body && typeof body.csrfToken === 'string') {
        return body.csrfToken;
      }
    } catch {
      // Intentionally swallow parse errors; validation will fail below.
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.clone().formData();
    const formToken = formData.get('csrfToken');
    if (typeof formToken === 'string') {
      return formToken;
    }
  }

  return null;
};
