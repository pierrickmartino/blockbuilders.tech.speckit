import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import jestDomPlugin from 'eslint-plugin-jest-dom';
import tailwindcssPlugin from 'eslint-plugin-tailwindcss';
import testingLibraryPlugin from 'eslint-plugin-testing-library';
import globals from 'globals';

const nextCoreWebVitals = nextPlugin.configs['core-web-vitals'];
const tsConfigs = tsPlugin.configs;
const tsRecommendedRules = tsConfigs.recommended?.rules ?? {};
const tsRecommendedTypeCheckedRules =
  tsConfigs.recommendedTypeChecked?.rules ??
  tsConfigs['recommended-requiring-type-checking']?.rules ??
  {};

export default [
  {
    ignores: [
      '.next/',
      'dist/',
      'out/',
      'coverage/',
      'playwright-report/',
      'node_modules/',
      'next-env.d.ts',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        JSX: true,
      },
    },
    plugins: {
      '@next/next': nextPlugin,
      '@typescript-eslint': tsPlugin,
      'testing-library': testingLibraryPlugin,
      'jest-dom': jestDomPlugin,
      tailwindcss: tailwindcssPlugin,
    },
    settings: {
      next: {
        rootDir: ['apps/frontend/'],
      },
      tailwindcss: {
        callees: ['clsx', 'cva', 'tw'],
        config: 'tailwind.config.ts',
      },
    },
    rules: {
      ...nextCoreWebVitals.rules,
      ...tsRecommendedRules,
      ...tsRecommendedTypeCheckedRules,
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-custom-classname': 'off',
      'testing-library/await-async-queries': 'error',
      'testing-library/no-render-in-setup': 'off',
      'testing-library/prefer-screen-queries': 'off',
      'jest-dom/prefer-enabled-disabled': 'warn',
      'jest-dom/prefer-in-document': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
  {
    files: ['tests/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      'testing-library/no-node-access': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
