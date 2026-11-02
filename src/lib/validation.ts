import { z } from 'zod';

export const phoneSchema = z.string().regex(/^09\d{9}$/, 'شماره همراه معتبر نیست (نمونه: ۰۹۱۲۳۴۵۶۷۸۹)');

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().length(5, 'کد تایید باید ۵ رقم باشد'),
  fullName: z.string().optional(),
});

export const bookingCreateSchema = z.object({
  salonId: z.union([z.number(), z.string()]),
  serviceId: z.union([z.number(), z.string()]),
  specialistId: z.union([z.number(), z.string()]),
  date: z.string().min(1, 'تاریخ الزامی است'),
  time: z.string().min(1, 'زمان الزامی است'),
  isMobileBooking: z.boolean().default(false),
  customerAddress: z.string().optional(),
  notes: z.string().optional(),
  price: z.union([z.number(), z.string()]),
});

export const bookingStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled']),
});

export const userUpdateSchema = z.object({
  fullName: z.string().optional(),
  name: z.string().optional(),
  role: z.string().optional(),
  salonId: z.union([z.number(), z.string(), z.null()]).optional(),
  email: z.string().email().optional(),
  status: z.enum(['active', 'suspended']).optional(),
  avatar: z.string().optional(),
  managedLine: z.string().nullable().optional(),
});

export const salonUpdateSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  isApproved: z.boolean().optional(),
  isVip: z.boolean().optional(),
  vipBadgeLabel: z.string().optional(),
});
export const userCreateSchema = z.object({
  fullName: z.string().min(2, 'نام الزامی است'),
  phone: phoneSchema,
  email: z.string().email().optional(),
  role: z.enum(['customer', 'salon_specialist', 'mobile_specialist', 'line_manager', 'salon_admin', 'super_admin']).default('customer'),
  salonId: z.union([z.number(), z.string()]).optional(),
});

export const salonCreateSchema = z.object({
  name: z.string().min(2, 'نام سالن الزامی است'),
  phone: z.string().min(8, 'شماره تماس الزامی است'),
  province: z.string().min(2),
  city: z.string().min(2),
  district: z.string().optional(),
  address: z.string().min(5),
  isVip: z.boolean().optional(),
  isMobileServiceActive: z.boolean().optional(),
  coverImage: z.string().optional(),
});
