import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

const baseUse = {
  baseURL,
  trace: 'on-first-retry' as const,
  screenshot: 'only-on-failure' as const,
  video: 'retain-on-failure' as const,
  extraHTTPHeaders: {
    'x-test-suite': 'frontend-smoke',
  },
};

const webServerEnv = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    'local-test-anon-key-placeholder',
  SUPABASE_URL: process.env.SUPABASE_URL ?? 'http://localhost:54321',
  NEXT_TELEMETRY_DISABLED: '1',
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: baseUse,
  webServer: {
    command: 'pnpm dev --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    env: webServerEnv,
  },
  projects: [
    {
      name: 'smoke',
      testDir: './tests/smoke',
      metadata: {
        description: 'Validates happy-path build metadata rendering',
      },
    },
    {
      name: 'smoke-fallback',
      testDir: './tests/smoke',
      use: {
        ...baseUse,
        extraHTTPHeaders: {
          ...baseUse.extraHTTPHeaders,
          'x-test-suite': 'frontend-smoke-fallback',
        },
      },
      metadata: {
        description: 'Ensures default labels render when git metadata missing',
      },
    },
    {
      name: 'auth',
      testDir: './tests/e2e',
      metadata: {
        description:
          'Exercises Supabase email auth flows, accessibility gates, and password policy compliance',
      },
    },
  ],
});
