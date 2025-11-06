import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: [
    '../../apps/frontend/components/design-system/**/*.stories.@(ts|tsx|mdx)',
  ],
  addons: [
    {
      name: '@storybook/addon-essentials',
      options: {
        docs: false,
      },
    },
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
  ],
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
};

export default config;
