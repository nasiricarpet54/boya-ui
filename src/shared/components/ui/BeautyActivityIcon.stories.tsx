import type { Meta, StoryObj } from '@storybook/react';
import { BeautyActivityIcon } from './BeautyActivityIcon';

const meta: Meta<typeof BeautyActivityIcon> = {
  title: 'UI/BeautyActivityIcon',
  component: BeautyActivityIcon,
  tags: ['autodocs'],
  argTypes: {
    activityId: {
      control: 'select',
      options: ['hair', 'nail', 'skincare', 'eyelash_eyebrow', 'bridal_makeup', 'massage_spa', 'pmu_tattoo'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    isActive: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof BeautyActivityIcon>;

export const Hair: Story = {
  args: {
    activityId: 'hair',
    size: 'md',
    isActive: false,
  },
};

export const ActiveNail: Story = {
  args: {
    activityId: 'nail',
    size: 'lg',
    isActive: true,
  },
};
