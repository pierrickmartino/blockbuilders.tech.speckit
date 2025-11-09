import Module, { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/nextjs';

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceNodeModules = path.resolve(dirname, '../../apps/frontend/node_modules');
const existingNodePath = process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : [];
if (!existingNodePath.includes(workspaceNodeModules)) {
  existingNodePath.push(workspaceNodeModules);
  process.env.NODE_PATH = existingNodePath.join(path.delimiter);
  Module._initPaths();
}

const frontendDir = path.resolve(dirname, '../../apps/frontend');

const config: StorybookConfig = {
  stories: [
    path.join(frontendDir, 'components/design-system/**/*.stories.@(ts|tsx)'),
    path.join(frontendDir, 'components/design-system/**/*.mdx'),
  ],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/nextjs',
    options: {
      builder: {
        useSWC: true,
      },
      nextConfigPath: '../../apps/frontend/next.config.mjs',
    },
  },
  docs: {
    autodocs: 'tag',
  },
  typescript: {
    // react-docgen-typescript currently crashes with TS bundler resolution, disable until upstream fix lands.
    reactDocgen: false,
  },
  webpackFinal: async (baseConfig) => {
    if (!baseConfig.module) {
      baseConfig.module = { rules: [] };
    }

    const rules = baseConfig.module.rules ?? [];
    const isMdxRule = (rule: unknown) =>
      typeof rule === 'object' &&
      rule !== null &&
      'test' in rule &&
      rule.test instanceof RegExp &&
      /(mdx)/.test(rule.test.source ?? '');

    baseConfig.module.rules = rules.filter((rule) => !isMdxRule(rule));
    baseConfig.module.rules.push({
      test: /\.mdx?$/,
      use: [
        {
          loader: require.resolve('@storybook/mdx2-csf/loader'),
          options: {
            mdxCompileOptions: {
              development: process.env.NODE_ENV !== 'production',
            },
          },
        },
      ],
    });

    baseConfig.resolve ??= {};
    baseConfig.resolve.alias ??= {};
    baseConfig.resolve.alias['@'] = path.resolve(dirname, '../../apps/frontend');
    baseConfig.resolve.alias['storybook/internal/theming'] = require.resolve('@storybook/theming');

    return baseConfig;
  },
};

export default config;
