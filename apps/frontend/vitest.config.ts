import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      lines: 0.8,
      functions: 0.8,
      statements: 0.8,
      branches: 0.8,
    },
  },
  resolve: {
    alias: {
      '@': path.join(__dirname),
    },
  },
});
