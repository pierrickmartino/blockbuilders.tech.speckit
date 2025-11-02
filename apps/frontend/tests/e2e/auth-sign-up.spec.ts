import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Route } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { evaluatePasswordPolicy } from '@/lib/auth/passwordPolicy';

const authRoutes = {
  signUp: '/auth/sign-up',
  signIn: '/auth/sign-in',
  verify: '/auth/verify',
};

const buildVerifiedAuthPayload = () => ({
  session: {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_at: Math.round(Date.now() / 1000) + 60 * 60,
    token_type: 'bearer' as const,
    email_confirmed: true,
  },
  user: {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'playwright@example.com',
    email_confirmed_at: new Date().toISOString(),
  },
});

const buildUnverifiedAuthPayload = () => ({
  session: {
    access_token: null,
    refresh_token: null,
    expires_at: null,
    token_type: 'bearer' as const,
    email_confirmed: false,
  },
  user: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'playwright@example.com',
    email_confirmed_at: null,
  },
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

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const getArtifactPath = () =>
  path.resolve(process.cwd(), '..', '..', 'artifacts', 'auth-password-policy.json');

test.describe('Supabase email auth flows', () => {
  test('routes newly registered but unverified users through the verification gate', async ({ page }) => {
    const signUpRequests: string[] = [];

    await page.route('**/api/auth/sign-up', async (route) => {
      signUpRequests.push(route.request().postData() ?? '');
      await fulfillJson(route, 202, buildUnverifiedAuthPayload());
    });

    await page.goto(authRoutes.signUp);
    await page.waitForResponse('**/api/auth/csrf');

    await page.getByLabel('Email address').fill('new-user@example.com');
    await page.getByLabel('Password').fill('ValidPassword1!');

    await page.getByRole('button', { name: 'Create account' }).click();
    await page.waitForResponse('**/api/auth/sign-up');
    await page.waitForURL((url) => url.pathname === authRoutes.verify);

    expect(signUpRequests).toHaveLength(1);
    await expect(page).toHaveURL(/\/auth\/verify$/);
    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resend verification email' })).toBeVisible();
  });

  test('allows verified users to sign in and return to the home page', async ({ page }) => {
    const signInRequests: string[] = [];

    await page.route('**/api/auth/sign-in', async (route) => {
      signInRequests.push(route.request().postData() ?? '');
      await fulfillJson(route, 200, buildVerifiedAuthPayload());
    });

    await page.goto(authRoutes.signIn);
    await page.waitForResponse('**/api/auth/csrf');

    await page.getByLabel('Email address').fill('verified@example.com');
    await page.getByLabel('Password').fill('ValidPassword2!');

    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForResponse('**/api/auth/sign-in');
    await page.waitForURL((url) => url.pathname === '/');

    expect(signInRequests).toHaveLength(1);
    await expect(page.getByRole('heading', { name: 'Your mono-repo is ready to build.' })).toBeVisible();
  });

  test('prevents duplicate Supabase submissions when users double-submit forms', async ({ page }) => {
    const registerDoubleSubmitAssertion = async (
      path: string,
      locatorText: string,
      passwordFieldLabel: string,
    ) => {
      const requests: string[] = [];

      await page.route(`**${path}`, async (route) => {
        requests.push(route.request().postData() ?? '');
        await delay(150);
        const payload =
          path.includes('sign-up') || path.includes('verify')
            ? buildUnverifiedAuthPayload()
            : buildVerifiedAuthPayload();
        await fulfillJson(route, 200, payload);
      });

      await page.goto(path === '/api/auth/sign-up' ? authRoutes.signUp : authRoutes.signIn);
      await page.waitForResponse('**/api/auth/csrf');

      await page.getByLabel('Email address').fill(`double-${locatorText}@example.com`);
      await page.getByLabel(passwordFieldLabel).fill('ValidPassword3!');

      await page.evaluate(() => {
        const form = document.querySelector('form');
        form?.requestSubmit();
        form?.requestSubmit();
      });

      await page.waitForResponse(`**${path}`);
      expect(requests).toHaveLength(1);

      await page.unroute(`**${path}`);
    };

    await registerDoubleSubmitAssertion('/api/auth/sign-up', 'signup', 'Password');
    await registerDoubleSubmitAssertion('/api/auth/sign-in', 'signin', 'Password');
  });

  test('rejects submissions that omit the CSRF cookie', async ({ page }) => {
    const assertCsrfGuard = async (path: string, submitLabel: string) => {
      await page.route(`**${path}`, async (route) => {
        const cookieHeader = route.request().headers()['cookie'] ?? '';
        expect(cookieHeader.includes('sb-auth-csrf')).toBe(false);
        await fulfillJson(route, 403, {
          code: 'invalid_csrf_token',
          message: 'We could not verify your request. Refresh the page and try again.',
        });
      });

      await page.goto(path === '/api/auth/sign-up' ? authRoutes.signUp : authRoutes.signIn);
      await page.waitForResponse('**/api/auth/csrf');

      await page.context().clearCookies();

      await page.getByLabel('Email address').fill(`csrf-${submitLabel}@example.com`);
      await page.getByLabel('Password').fill('ValidPassword4!');

      await page.getByRole('button', { name: submitLabel }).click();
      await page.waitForResponse(`**${path}`);

      await expect(
        page.getByText('We could not verify your request. Refresh the page and try again.'),
      ).toBeVisible();

      await page.unroute(`**${path}`);
    };

    await assertCsrfGuard('/api/auth/sign-up', 'Create account');
    await assertCsrfGuard('/api/auth/sign-in', 'Sign in');
  });

  test('meets accessibility expectations and supports keyboard-only navigation', async ({ page }) => {
    const describeActiveElement = () =>
      page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element) {
          return 'none';
        }

        const name =
          element.getAttribute('aria-label') ??
          element.getAttribute('name') ??
          element.id ??
          element.textContent?.trim() ??
          element.tagName.toLowerCase();

        return `${element.tagName.toLowerCase()}::${name}`;
      });

    const routesToValidate = [
      { path: authRoutes.signUp, submitLabel: 'Create account' },
      { path: authRoutes.signIn, submitLabel: 'Sign in' },
      { path: authRoutes.verify, submitLabel: 'Resend verification email' },
    ];

    for (const route of routesToValidate) {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      const accessibilityScan = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScan.violations).toEqual([]);

      const focusTrail: string[] = [];
      for (let i = 0; i < 4; i += 1) {
        await page.keyboard.press('Tab');
        focusTrail.push(await describeActiveElement());
      }

      expect(new Set(focusTrail).size).toBeGreaterThan(1);
      await expect(page.getByRole('button', { name: route.submitLabel })).toBeVisible();
    }
  });

  test('records password policy compliance stats and enforces ≥95% success rate', async ({ page }, testInfo) => {
    const candidates = [
      'ValidPassword1!',
      'ValidPassword2@',
      'ValidPassword3#',
      'ValidPassword4$',
      'ValidPassword5%',
      'ValidPassword6^',
      'ValidPassword7&',
      'ValidPassword8*',
      'ValidPassword9(',
      'ValidPassword10)',
      'ValidPassword11_',
      'ValidPassword12+',
      'lowercaseonly1!',
      'SHORT1!',
      'NoNumber!!!!!',
      'nosymbols1234',
      'NOCAPS1234!',
      'ValidPolicy13=',
      'ValidPolicy14?',
      'ValidPolicy15~',
      'validPolicy16?',
      'Validpolicy17',
    ];

    const attemptSummaries: Array<{
      password: string;
      isValid: boolean;
      requestTriggered: boolean;
      status?: number;
    }> = [];

    await page.route('**/api/auth/sign-up', async (route) => {
      await fulfillJson(route, 201, buildVerifiedAuthPayload());
    });

    for (const [index, password] of candidates.entries()) {
      await page.goto(authRoutes.signUp);
      await page.waitForResponse('**/api/auth/csrf');

      const evaluation = evaluatePasswordPolicy(password);
      const attempt = {
        password,
        isValid: evaluation.isValid,
        requestTriggered: false,
        status: undefined as number | undefined,
      };

      await page.getByLabel('Email address').fill(`password-${index}@example.com`);
      await page.getByLabel('Password').fill(password);

      if (evaluation.isValid) {
        let responseStatus = 0;
        await Promise.all([
          page.waitForResponse('**/api/auth/sign-up').then((response) => {
            responseStatus = response.status();
          }),
          page.getByRole('button', { name: 'Create account' }).click(),
        ]);
        attempt.requestTriggered = true;
        attempt.status = responseStatus;
        await page.waitForURL((url) => url.pathname === '/');
      } else {
        const submit = page.getByRole('button', { name: 'Create account' });
        await expect(submit).toBeDisabled();
      }

      attemptSummaries.push(attempt);
    }

    await page.unroute('**/api/auth/sign-up');

    const compliantAttempts = attemptSummaries.filter((attempt) => attempt.isValid);
    const successfulAttempts = compliantAttempts.filter(
      (attempt) => attempt.requestTriggered && attempt.status === 201,
    );
    const complianceRate =
      compliantAttempts.length === 0
        ? 1
        : successfulAttempts.length / compliantAttempts.length;

    expect(complianceRate).toBeGreaterThanOrEqual(0.95);
    expect(compliantAttempts.length).toBeGreaterThanOrEqual(12);
    expect(attemptSummaries.length).toBeGreaterThanOrEqual(20);

    const artifactPath = getArtifactPath();
    await fs.mkdir(path.dirname(artifactPath), { recursive: true });
    await fs.writeFile(
      artifactPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          project: testInfo.project.name,
          totalAttempts: attemptSummaries.length,
          compliantAttempts: compliantAttempts.length,
          successfulAttempts: successfulAttempts.length,
          complianceRate,
          attempts: attemptSummaries,
        },
        null,
        2,
      ),
      'utf8',
    );
  });
});
