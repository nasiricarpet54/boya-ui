import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  phone: z.string().regex(/^09\d{9}$/, 'شماره موبایل معتبر نیست (مثال: 09123456789)'),
});

export const otpSchema = z.object({
  otp: z.string().length(5, 'کد تایید باید ۵ رقم باشد'),
});

// Booking schemas (supporting both string and numeric IDs)
export const bookingSchema = z.object({
  salonId: z.union([z.string(), z.number()]),
  serviceId: z.union([z.string(), z.number()]),
  specialistId: z.union([z.string(), z.number()]),
  date: z.string(),
  time: z.string(),
  customerName: z.string().min(2, 'نام باید حداقل ۲ حرف باشد'),
  customerPhone: z.string().regex(/^09\d{9}$/, 'شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)'),
  customerAddress: z.string().optional().or(z.literal('')),
  notes: z.string().optional(),
});

// Admin schemas
export const updateSalonSchema = z.object({
  name: z.string().min(2, 'نام سالن الزامی است'),
  address: z.string().min(5, 'آدرس الزامی است'),
  phone: z.string().optional(),
});
