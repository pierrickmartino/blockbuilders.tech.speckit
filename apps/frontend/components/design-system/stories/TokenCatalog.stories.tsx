import type { Meta, StoryObj } from '@storybook/react';
import { TokenGallery } from '../TokenGallery';

const meta: Meta<typeof TokenGallery> = {
  title: 'Design System/Tokens/Catalog',
  component: TokenGallery,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof TokenGallery>;

export const Gallery: Story = {
  name: 'Gallery',
};
