import type { Meta, StoryObj } from '@storybook/react';
import { BoyaLogo } from './BoyaLogo';

const meta: Meta<typeof BoyaLogo> = {
  title: 'UI/BoyaLogo',
  component: BoyaLogo,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['full', 'symbol', 'header', 'badge', 'animated'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', 'hero'],
    },
    showText: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof BoyaLogo>;

export const Default: Story = {
  args: {
    variant: 'full',
    size: 'md',
    showText: true,
  },
};

export const Header: Story = {
  args: {
    variant: 'header',
    size: 'sm',
    showText: true,
  },
};

export const Animated: Story = {
  args: {
    variant: 'animated',
    size: 'lg',
    showText: false,
  },
};
