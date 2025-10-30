import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/smoke',
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
      metadata: {
        description: 'Validates happy-path build metadata rendering',
      },
    },
    {
      name: 'smoke-fallback',
      metadata: {
        description: 'Ensures default labels render when git metadata missing',
      },
    },
  ],
});
