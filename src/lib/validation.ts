import { z } from 'zod';
import { normalizeToIsoDate, normalizeTimeToLatin, toLatinDigits } from '../shared/utils/dateIsoConverter';

export const phoneSchema = z.string().regex(/^09\d{9}$/, 'شماره همراه معتبر نیست (نمونه: ۰۹۱۲۳۴۵۶۷۸۹)');

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().length(5, 'کد تایید باید ۵ رقم باشد'),
  fullName: z.string().optional(),
});

/**
 * Booking creation payload.
 *
 * `date` and `time` arrive in whatever the customer picked — Persian digits,
 * a Jalali numeric string, or a Persian day label. They are normalized here,
 * server-side, to the canonical `YYYY-MM-DD` / `HH:MM` form that the
 * double-booking unique constraint relies on. Anything that cannot be
 * interpreted is rejected instead of being silently moved to "today".
 *
 * `price` is deliberately NOT accepted: the server always charges the catalog
 * price from the services table so a tampered request cannot book at an
 * arbitrary price.
 */
export const bookingCreateSchema = z.object({
  salonId: z.union([z.number(), z.string()]),
  serviceId: z.union([z.number(), z.string()]),
  specialistId: z.union([z.number(), z.string()]),
  date: z.string().min(1, 'تاریخ الزامی است'),
  time: z.string().min(1, 'زمان الزامی است'),
  isMobileBooking: z.boolean().default(false),
  customerAddress: z.string().optional(),
  notes: z.string().optional(),
}).transform((v) => {
  const isoDate = normalizeToIsoDate(toLatinDigits(v.date));
  const latinTime = normalizeTimeToLatin(v.time);
  if (!isoDate) throw new z.ZodError([{
    code: 'custom', path: ['date'],
    message: 'تاریخ انتخابی معتبر نیست. لطفاً یک روز از تقویم انتخاب کنید.',
  }]);
  if (!latinTime) throw new z.ZodError([{
    code: 'custom', path: ['time'],
    message: 'سانس انتخابی معتبر نیست.',
  }]);
  return { ...v, date: isoDate, time: latinTime };
}).refine((v) => {
  // A mobile (at-home) booking cannot be booked without a service address.
  return !(v.isMobileBooking && !String(v.customerAddress ?? '').trim());
}, { message: 'برای خدمات در محل، ذخیره آدرس دقیق الزامی است.', path: ['customerAddress'] });

export const bookingStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled']),
});

export const userUpdateSchema = z.object({
  fullName: z.string().optional(),
  role: z.enum(['customer', 'salon_specialist', 'mobile_specialist', 'line_manager', 'salon_admin', 'super_admin']).optional(),
  // Coerce to an integer so a string salonId from a JSON body cannot reach
  // the integer column and produce a confusing 500.
  salonId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  email: z.string().email().optional(),
  status: z.enum(['active', 'suspended']).optional(),
  avatar: z.string().optional(),
  managedLine: z.string().nullable().optional(),
});

export const salonUpdateSchema = z.object({
  name: z.string().optional(), address: z.string().optional(), phone: z.string().optional(),
  province: z.string().optional(), city: z.string().optional(), district: z.string().optional(),
  latitude: z.string().optional(), longitude: z.string().optional(),
  isApproved: z.boolean().optional(),
  // `status` used to be sent by the admin dashboard and silently dropped by
  // Zod, so the salon status never persisted. It is now part of the schema.
  status: z.enum(['active', 'pending', 'suspended']).optional(),
  isVip: z.boolean().optional(), vipBadgeLabel: z.string().optional(), coverImage: z.string().optional(),
  gallery: z.union([z.string(), z.array(z.string())]).optional(), licenseDocUrl: z.string().max(2048).optional(),
  // VIP ranking is an admin-only field; `displayPriority` was likewise being
  // dropped by the old schema so pinning a VIP salon did nothing.
  displayPriority: z.number().int().min(1).max(99).optional(),
  ownerName: z.string().optional(),
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
  type: z.string().default('promotional'),
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
  // salonId is optional: an independent/mobile specialist owns the service
  // (ownerId resolved server-side) instead of attaching it to a salon.
  salonId: z.union([z.number(), z.string()]).optional(),
  serviceLineId: z.string().default('hair'),
  name: z.string().min(1, 'نام خدمت الزامی است'),
  description: z.string().optional().nullable(),
  price: z.union([
    z.number().positive('قیمت خدمت باید بزرگتر از صفر باشد'),
    z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, 'قیمت خدمت باید بزرگتر از صفر باشد'),
  ]),
  durationMinutes: z.union([
    z.number().int().positive('مدت زمان خدمت باید حداقل ۱ دقیقه باشد'),
    z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, 'مدت زمان خدمت باید حداقل ۱ دقیقه باشد'),
  ]).transform(val => Number(val)),
  isMobileAvailable: z.boolean().default(false),
  imageUrl: z.string().optional().nullable(),
  // specialists offering this service ("لاین خدمات با متخصص آن لاین").
  // The server validates each belongs to the salon AND to the same line.
  specialistIds: z.array(z.union([z.number(), z.string()])).optional(),
});

export const serviceUpdateSchema = serviceCreateSchema.partial();

/**
 * Independent specialist's own service create/edit. No salonId at all — the
 * owner is resolved from the authenticated user. Price + duration back the
 * "هزینه خدمات" requirement; the rest mirrors serviceCreateSchema.
 */
export const myServiceSchema = z.object({
  name: z.string().min(1, 'نام خدمت الزامی است'),
  description: z.string().optional().nullable(),
  price: z.union([
    z.number().positive('قیمت خدمت باید بزرگتر از صفر باشد'),
    z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, 'قیمت خدمت باید بزرگتر از صفر باشد'),
  ]),
  durationMinutes: z.union([
    z.number().int().positive('مدت زمان خدمت باید حداقل ۱ دقیقه باشد'),
    z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, 'مدت زمان خدمت باید حداقل ۱ دقیقه باشد'),
  ]).transform(val => Number(val)),
  isMobileAvailable: z.boolean().default(false),
  imageUrl: z.string().optional().nullable(),
  serviceLineId: z.string().optional(),
  // Own junction row is implied for the caller; client may not set it.
  specialistIds: z.array(z.union([z.number(), z.string()])).optional(),
});

export const myServiceUpdateSchema = myServiceSchema.partial();

/** Independent specialist portfolio item — no specialistId from the client. */
export const myPortfolioSchema = z.object({
  title: z.string().min(1, 'عنوان نمونه‌کار الزامی است'),
  imageUrl: z.string().min(1, 'تصویر نمونه‌کار الزامی است'),
  category: z.string().default('general'),
});

/**
 * Salon-admin service portfolio image ("نمونه‌کار خدمات"). The service is
 * named in the path; the body only carries the image plus an optional title.
 */
export const servicePortfolioCreateSchema = z.object({
  imageUrl: z.string().min(1, 'تصویر نمونه‌کار الزامی است'),
  title: z.string().max(120).optional().nullable(),
});

export const servicePortfolioUpdateSchema = z.object({
  imageUrl: z.string().min(1).optional(),
  title: z.string().max(120).optional().nullable(),
});

/**
 * Salon-admin specialist creation. The salon manager only supplies a phone
 * number (and optional profile fields); the user record is resolved server-side
 * via getOrCreateUserByPhone, so nothing client-controlled can pick a userId.
 */
export const specialistCreateSchema = z.object({
  phone: z.string().min(1, 'شماره همراه متخصص الزامی است.'),
  fullName: z.string().optional(),
  salonId: z.union([z.number(), z.string()]),
  specialtyLine: z.string().default('hair'),
  bio: z.string().optional().nullable(),
  experienceYears: z.union([z.number().int().min(0), z.string()]).optional(),
  isMobileActive: z.boolean().default(false),
  isRentedChair: z.boolean().default(false),
  avatarUrl: z.string().optional().nullable(),
  // Document URLs backing the super-admin approval step.
  documents: z.array(z.string()).optional(),
});

export const specialistUpdateSchema = z.object({
  fullName: z.string().optional(),
  specialtyLine: z.string().optional(),
  bio: z.string().optional().nullable(),
  experienceYears: z.union([z.number().int().min(0), z.string()]).optional(),
  isMobileActive: z.boolean().optional(),
  isRentedChair: z.boolean().optional(),
  avatarUrl: z.string().optional().nullable(),
  workingHours: z.string().optional().nullable(),
  workingDays: z.array(z.string()).optional().nullable(),
  commissionPercent: z.number().int().min(0).max(100).nullable().optional(),
  documents: z.array(z.string()).optional(),
});

/**
 * Per-service commission override body: [{ serviceId, commissionPercent }].
 * PUT replaces the specialist's whole override set.
 */
export const commissionOverridesSchema = z.array(z.object({
  serviceId: z.union([z.number(), z.string()]),
  commissionPercent: z.number().int().min(0).max(100),
}));

export const salonScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().min(1),
  closeTime: z.string().min(1),
  isActive: z.boolean().default(true),
}).refine((v) => v.openTime !== v.closeTime, {
  message: 'ساعت شروع و پایان نمی‌تواند یکسان باشد.',
  path: ['closeTime'],
});
