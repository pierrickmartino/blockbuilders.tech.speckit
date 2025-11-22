import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'tests/{unit,integration}/**/*.spec.ts',
      'tests/design-system/**/*.spec.ts',
      'components/**/__tests__/**/*.{test,spec}.{ts,tsx}',
    ],
    setupFiles: ['tests/setup/vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 0.8,
        functions: 0.8,
        statements: 0.8,
        branches: 0.8,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.join(__dirname),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
});
