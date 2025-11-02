import { expect, test } from '@playwright/test';
import type { Route } from '@playwright/test';

const routes = {
  signIn: '/auth/sign-in',
  dashboard: '/dashboard',
  verify: '/auth/verify',
};

type SessionState = 'active' | 'expired';

const buildActiveSession = () => ({
  session: {
    access_token: 'active-access-token',
    refresh_token: 'active-refresh-token',
    expires_at: Math.round(Date.now() / 1000) + 60 * 60,
    token_type: 'bearer' as const,
    email_confirmed: true,
  },
  user: {
    id: '99999999-9999-9999-9999-999999999999',
    email: 'session@example.com',
    email_confirmed_at: new Date().toISOString(),
  },
});

const buildExpiredSession = () => ({
  code: 'session_expired',
  message: 'Your Supabase session expired. Please sign in again.',
});

const fulfillJson = async (route: Route, status: number, payload: unknown) => {
  await route.fulfill({
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
    body: JSON.stringify(payload),
  });
};

test.describe('Supabase session persistence', () => {
  test('maintains sessions across reloads and redirects with return context when expired', async ({
    page,
  }) => {
    let sessionState: SessionState = 'active';

    await page.route('**/api/auth/sign-in', async (route) => {
      await fulfillJson(route, 200, buildActiveSession());
    });

    await page.route('**/api/auth/session', async (route) => {
      if (sessionState === 'active') {
        await fulfillJson(route, 200, buildActiveSession());
      } else {
        await fulfillJson(route, 401, buildExpiredSession());
      }
    });

    await page.goto(routes.signIn);
    await page.waitForResponse('**/api/auth/csrf');

    await page.getByLabel('Email address').fill('session@example.com');
    await page.getByLabel('Password').fill('ValidPassword1!');

    await Promise.all([
      page.waitForResponse('**/api/auth/sign-in'),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ]);

    await page.waitForURL((url) => url.pathname === '/');

    await page.goto(routes.dashboard);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId('protected-session-email')).toHaveText(
      'session@example.com',
    );

    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId('protected-session-email')).toHaveText(
      'session@example.com',
    );

    sessionState = 'expired';

    await page.evaluate(async () => {
      await window.__supabaseSessionTestHooks?.forceSessionRefresh();
    });

    await page.waitForURL((url) => url.pathname === routes.signIn);
    await expect(page).toHaveURL(
      new RegExp(`/auth/sign-in\\?returnTo=${encodeURIComponent(routes.dashboard)}`),
    );
  });

  test('captures performance metrics after simulated inactivity window', async ({
    page,
  }) => {
    let sessionState: SessionState = 'active';

    await page.route('**/api/auth/sign-in', async (route) => {
      await fulfillJson(route, 200, buildActiveSession());
    });

    await page.route('**/api/auth/session', async (route) => {
      if (sessionState === 'active') {
        await fulfillJson(route, 200, buildActiveSession());
      } else {
        await fulfillJson(route, 401, buildExpiredSession());
      }
    });

    await page.goto(routes.signIn);
    await page.waitForResponse('**/api/auth/csrf');

    await page.getByLabel('Email address').fill('metrics@example.com');
    await page.getByLabel('Password').fill('ValidPassword1!');

    await Promise.all([
      page.waitForResponse('**/api/auth/sign-in'),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ]);

    await page.waitForURL((url) => url.pathname === '/');
    await page.goto(routes.dashboard);

    await page.evaluate(() => {
      window.__supabaseSessionTestHooks?.freezeTime?.(30 * 60 * 1000);
    });

    sessionState = 'expired';
    await page.evaluate(async () => {
      const metrics = await window.__supabaseSessionTestHooks?.collectMetrics?.();
      window.__supabaseSessionTestHooks?.logMetrics(metrics);
      await window.__supabaseSessionTestHooks?.forceSessionRefresh();
    });

    await page.waitForURL((url) => url.pathname === routes.signIn);

    const report = await page.evaluate(() => window.__supabaseSessionTestHooks?.getLastMetrics?.());
    expect(report).toBeDefined();
    expect(report?.navigationTimings?.timeToFirstByte).toBeLessThanOrEqual(2000);
    expect(report?.navigationTimings?.largestContentfulPaint).toBeLessThanOrEqual(2500);
    expect(report?.api?.supabaseLatencyP95).toBeLessThanOrEqual(200);
  });

  test('falls back to in-memory session storage when cookies are unavailable', async ({
    page,
  }) => {
    await page.route('**/api/auth/sign-in', async (route) => {
      await fulfillJson(route, 200, buildActiveSession());
    });

    await page.route('**/api/auth/session', async (route) => {
      await fulfillJson(route, 200, buildActiveSession());
    });

    await page.goto(routes.signIn);
    await page.waitForResponse('**/api/auth/csrf');

    await page.evaluate(() => {
      window.__supabaseSessionTestHooks?.setCookiesEnabled(false);
    });

    await page.getByLabel('Email address').fill('fallback@example.com');
    await page.getByLabel('Password').fill('ValidPassword1!');

    await Promise.all([
      page.waitForResponse('**/api/auth/sign-in'),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ]);

    await page.waitForURL((url) => url.pathname === '/');

    await page.goto(routes.dashboard);
    await expect(page.getByTestId('protected-session-email')).toHaveText(
      'session@example.com',
    );

    const storageMode = await page.evaluate(
      () => window.__supabaseSessionTestHooks?.getStorageMode(),
    );

    expect(storageMode).toBe('memory');
  });
});
