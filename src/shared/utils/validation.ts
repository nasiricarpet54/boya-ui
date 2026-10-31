import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  phone: z.string().regex(/^09\d{9}$/, 'شماره موبایل معتبر نیست (مثال: 09123456789)'),
});

export const otpSchema = z.object({
  otp: z.string().length(5, 'کد تایید باید ۵ رقم باشد'),
});

// Booking schemas
export const bookingSchema = z.object({
  salonId: z.string(),
  serviceId: z.string(),
  specialistId: z.string(),
  date: z.string(),
  time: z.string(),
  customerName: z.string().min(3, 'نام باید حداقل ۳ حرف باشد'),
  customerPhone: z.string().regex(/^09\d{9}$/, 'شماره موبایل معتبر نیست'),
  customerAddress: z.string().min(5, 'آدرس الزامی است').optional().or(z.literal('')),
  notes: z.string().optional(),
});

// Admin schemas
export const updateSalonSchema = z.object({
  name: z.string().min(2, 'نام سالن الزامی است'),
  address: z.string().min(5, 'آدرس الزامی است'),
  phone: z.string().optional(),
});
