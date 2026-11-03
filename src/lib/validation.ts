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
  price: z.union([z.number(), z.string()]).optional(),
});

export const bookingStatusUpdateSchema = z.object({ status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled']) });
export const userUpdateSchema = z.object({
  fullName: z.string().optional(), name: z.string().optional(), role: z.enum(['customer', 'salon_specialist', 'mobile_specialist', 'line_manager', 'salon_admin', 'super_admin']).optional(),
  salonId: z.union([z.number(), z.string(), z.null()]).optional(), email: z.string().email().optional(),
  status: z.enum(['active', 'suspended']).optional(), avatar: z.string().optional(), managedLine: z.string().nullable().optional(),
});
export const salonUpdateSchema = z.object({
  name: z.string().optional(), address: z.string().optional(), phone: z.string().optional(),
  province: z.string().optional(), city: z.string().optional(), district: z.string().optional(),
  latitude: z.string().optional(), longitude: z.string().optional(), isApproved: z.boolean().optional(),
  isVip: z.boolean().optional(), vipBadgeLabel: z.string().optional(), coverImage: z.string().optional(),
  gallery: z.union([z.string(), z.array(z.string())]).optional(), licenseDocUrl: z.string().max(2048).optional(),
});
export const userCreateSchema = z.object({
  fullName: z.string().min(2, 'نام الزامی است'), phone: phoneSchema, email: z.string().email().optional(),
  role: z.enum(['customer', 'salon_specialist', 'mobile_specialist', 'line_manager', 'salon_admin', 'super_admin']).default('customer'),
  salonId: z.union([z.number(), z.string()]).optional(),
});
export const salonCreateSchema = z.object({
  name: z.string().min(2, 'نام سالن الزامی است (حداقل ۲ حرف)'), phone: z.string().min(4, 'شماره تماس سالن الزامی است'),
  province: z.string().min(1, 'استان الزامی است'), city: z.string().min(1, 'شهر الزامی است'),
  district: z.string().optional().default(''), address: z.string().min(1, 'آدرس دقیق سالن الزامی است'),
  isVip: z.boolean().optional().default(false), isMobileServiceActive: z.boolean().optional().default(false), coverImage: z.string().optional(),
});

export const notificationCreateSchema = z.object({
  title: z.string().min(1, 'عنوان اعلان الزامی است'),
  content: z.string().min(1, 'متن اعلان الزامی است'),
  type: z.string().default('informational'),
  targetAudience: z.string().default('all'),
  channel: z.string().default('in_app'),
  actionUrl: z.string().optional().nullable(),
  actionText: z.string().optional().nullable(),
  badgeText: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const adminProfileUpdateSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  emergencyPhone: z.string().optional().nullable(),
  positionTitle: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  securityAlertSms: z.boolean().optional(),
  newSalonsNotifySms: z.boolean().optional(),
  weeklyReportsEmail: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
});

export const serviceCreateSchema = z.object({
  salonId: z.union([z.number(), z.string()]),
  serviceLineId: z.string().default('hair'),
  name: z.string().min(1, 'نام خدمت الزامی است'),
  description: z.string().optional().nullable(),
  price: z.union([
    z.number().positive('قیمت خدمت باید بزرگتر از صفر باشد'),
    z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, 'قیمت خدمت باید بزرگتر از صفر باشد')
  ]),
  durationMinutes: z.union([
    z.number().int().positive('مدت زمان خدمت باید حداقل ۱ دقیقه باشد'),
    z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, 'مدت زمان خدمت باید حداقل ۱ دقیقه باشد')
  ]).transform(val => Number(val)),
  isMobileAvailable: z.boolean().default(false),
  imageUrl: z.string().optional().nullable(),
});

export const serviceUpdateSchema = serviceCreateSchema.partial();

export const specialistCreateSchema = z.object({
  userId: z.union([z.number(), z.string()]),
  salonId: z.union([z.number(), z.string()]),
  specialtyLine: z.string().default('hair'),
  bio: z.string().optional().nullable(),
  experienceYears: z.number().int().min(0).default(1),
  isMobileActive: z.boolean().default(false),
  avatarUrl: z.string().optional().nullable(),
});

export const specialistUpdateSchema = specialistCreateSchema.partial();

