import type { Preview } from '@storybook/react';
import '../../apps/frontend/app/globals.css';
import {
  ThemeProvider,
  type ThemeMode,
} from '../../apps/frontend/components/design-system/ThemeProvider';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    layout: 'fullscreen',
    backgrounds: { disable: true },
  },
  globalTypes: {
    theme: {
      description: 'Theme preference applied via ThemeProvider',
      defaultValue: 'system',
      toolbar: {
        icon: 'mirror',
        dynamicTitle: true,
        items: [
          { value: 'system', left: '💻', title: 'System' },
          { value: 'light', left: '☀️', title: 'Light' },
          { value: 'dark', left: '🌙', title: 'Dark' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme as ThemeMode | undefined;
      const forcedTheme = theme === undefined || theme === 'system' ? undefined : theme;
      const defaultMode = theme ?? 'system';

      return (
        <ThemeProvider forcedTheme={forcedTheme} defaultMode={defaultMode}>
          <Story />
        </ThemeProvider>
      );
    },
  ],
};

export default preview;
