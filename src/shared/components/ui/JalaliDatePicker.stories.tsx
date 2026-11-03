import type { Meta, StoryObj } from '@storybook/react';
import { JalaliDatePicker } from './JalaliDatePicker';

const meta: Meta<typeof JalaliDatePicker> = {
  title: 'UI/JalaliDatePicker',
  component: JalaliDatePicker,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    selectedDate: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof JalaliDatePicker>;

export const Default: Story = {
  args: {
    label: 'تاریخ رزرو نوبت (شمسی)',
    placeholder: 'انتخاب تاریخ از تقویم...',
    disabled: false,
  },
};

export const SelectedValue: Story = {
  args: {
    label: 'تاریخ منتخب رزرو',
    selectedDate: '1403/08/15',
    placeholder: 'انتخاب تاریخ از تقویم...',
    disabled: false,
  },
};

export const Disabled: Story = {
  args: {
    label: 'تاریخ ثبت شده (غیرقابل تغییر)',
    selectedDate: '1403/08/01',
    disabled: true,
  },
};
