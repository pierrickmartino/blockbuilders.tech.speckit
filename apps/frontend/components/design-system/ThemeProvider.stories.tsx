'use client';

import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider, type ThemeMode, useTheme } from './ThemeProvider';

const ThemeStatus = () => {
  const { mode, resolvedMode } = useTheme();

  return (
    <div
      style={{
        border: '1px solid rgba(15, 23, 42, 0.08)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '320px',
        lineHeight: 1.45,
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(15, 23, 42, 0.6)' }}>
          Preference
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '1.125rem', fontWeight: 600 }}>{mode}</p>
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(15, 23, 42, 0.6)' }}>
          Applied theme
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '1.125rem', fontWeight: 600 }}>{resolvedMode}</p>
      </div>
      <p style={{ margin: 0, fontSize: '0.875rem', color: 'rgba(15, 23, 42, 0.7)' }}>
        Use the toolbar control labelled “Theme” to preview light, dark, or system mode.
      </p>
    </div>
  );
};

const meta: Meta<typeof ThemeProvider> = {
  title: 'Design System/Theme/ThemeProvider',
  component: ThemeProvider,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    defaultMode: {
      control: { type: 'radio' },
      options: ['system', 'light', 'dark'],
      description: 'Initial theme preference when no stored value is found.',
    },
  },
  args: {
    defaultMode: 'system' as ThemeMode,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <ThemeProvider {...args}>
      <ThemeStatus />
    </ThemeProvider>
  ),
};
