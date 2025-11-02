import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: {
      'x-test-suite': 'frontend-smoke',
    },
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
