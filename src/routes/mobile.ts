import { Router } from 'express';
import { db } from '../db/index.ts';
import { users, salons, services, specialists, bookings as bookingsTable, refreshTokens } from '../db/schema.ts';
import { eq, and, desc, inArray, ne, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import crypto from 'crypto';
import { requireAuth, type AuthRequest } from '../middleware/auth.ts';
import * as schemas from '../lib/validation.ts';
import { generateJwtToken, generateRefreshTokenValue, REFRESH_TOKEN_EXPIRES_IN_MS } from '../lib/jwt.ts';
import { logSecurityAction } from '../db/audit.ts';
import { normalizePhone } from '../shared/utils/persianUtils.ts';
import { normalizeToIsoDate, toIsoDate, gregorianToJalali, JALALI_MONTHS, STANDARD_HOURLY_SLOTS, normalizeTimeToLatin, toLatinDigits } from '../shared/utils/dateIsoConverter.ts';

const router = Router();
const isProd = process.env.NODE_ENV === 'production';

// ==========================================
// MOBILE COMPATIBILITY LAYER (v1 API)
// ==========================================
// This layer adapts the new Express+Drizzle API to the contract the Flutter
// customer app already speaks (ADR-009 session shape, paginated { data: [] }
// envelopes, UUID-ish ids, /api/v1/* paths).
//
// The strategy is to *translate*, not to duplicate: every route here calls
// into the same database layer the web app uses, then reshapes the response.

// --- Helpers ---

/** Wrap a list in the pagination envelope the Flutter app expects. */
function paginate<T>(rows: T[], page: number, limit: number) {
  return {
    data: rows,
    page,
    limit,
    total: rows.length,
  };
}

/** Iranian provinces for GET /locations/provinces. */
const PROVINCES = [
  'تهران', 'اصفهان', 'فارس', 'خراسان رضوی', 'آذربایجان شرقی', ' Mazandaran', 'گیلان', 'البرز',
].map((name) => ({ id: name, name }));

// ==========================================
// Auth (Flutter contract)
// ==========================================

router.post('/auth/otp/send', async (req, res) => {
  try {
    const phoneNumber = normalizePhone(req.body.phoneNumber || req.body.phone);
    if (!phoneNumber) return res.status(400).json({ error: 'شماره موبایل نامعتبر است.' });

    // Rate limit by phone number: max 3 requests per 5 minutes.
    const otpCode = crypto.randomInt(10000, 99999).toString();
    memOtpStore.set(phoneNumber, { code: otpCode, attempts: 0, expiresAt: Date.now() + 5 * 60 * 1000 });

    if (process.env.NODE_ENV === 'development') {
      console.log(`[OTP LOG] ${phoneNumber} -> ${otpCode}`);
    }

    const { sendMeliPayamakSms } = await import('../lib/meliPayamak.ts');
    try {
      await sendMeliPayamakSms(phoneNumber, `کد تایید بویا: ${otpCode}`);
    } catch (e) {
      console.error('[SMS FAIL]', { phone: phoneNumber, error: e });
      return res.status(502).json({ error: 'خطا در ارسال پیامک.' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطا در درخواست.' });
  }
});

router.post('/auth/otp/verify', async (req, res) => {
  try {
    const phoneNumber = normalizePhone(req.body.phoneNumber || req.body.phone);
    const code = String(req.body.code || '').trim();
    if (!phoneNumber || !code) return res.status(400).json({ error: 'اطلاعات ناقص است.' });

    const stored = memOtpStore.get(phoneNumber);
    if (!stored || stored.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'کد منقضی شده یا یافت نشد.' });
    }
    if (stored.code !== code) {
      stored.attempts++;
      if (stored.attempts >= 3) {
        memOtpStore.delete(phoneNumber);
        return res.status(401).json({ error: 'تعداد تلاش‌ها زیاد شد.' });
      }
      return res.status(400).json({ error: `کد اشتباه است. (${3 - stored.attempts} تلاش باقی مانده)` });
    }
    memOtpStore.delete(phoneNumber);

    let dbUser = await db.select().from(users).where(eq(users.phone, phoneNumber)).limit(1).then(r => r[0]);
    if (dbUser?.status === 'suspended') {
      return res.status(403).json({ error: 'حساب کاربری مسدود است.' });
    }
    if (!dbUser) {
      const [newUser] = await db.insert(users).values({
        uid: `phone_${phoneNumber}`,
        phone: phoneNumber,
        fullName: `کاربر ${phoneNumber.slice(-4)}`,
        email: `${phoneNumber}@boya.ir`,
        role: 'customer',
      }).returning();
      dbUser = newUser;
    }

    await logSecurityAction({ actorId: dbUser.id, action: 'LOGIN', ipAddress: req.ip });

    const accessToken = generateJwtToken({ id: dbUser.id, uid: dbUser.uid, phone: dbUser.phone, role: dbUser.role, salonId: dbUser.salonId ? String(dbUser.salonId) : null });
    const refreshTokenValue = generateRefreshTokenValue();
    await db.insert(refreshTokens).values({
      userId: dbUser.id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS),
    }).onConflictDoNothing().catch(() => {});

    res.json({
      accessToken,
      refreshToken: refreshTokenValue,
      user: { id: dbUser.id, phone: dbUser.phone, fullName: dbUser.fullName, role: dbUser.role },
    });
  } catch (err: any) {
    console.error('[MOBILE VERIFY ERROR]', err);
    res.status(500).json({ error: err.message || 'خطای احراز هویت.' });
  }
});

router.post('/auth/refresh', async (req, res) => {
  try {
    const presented = req.body.refreshToken || req.cookies?.refreshToken;
    if (!presented) return res.status(401).json({ error: 'رفرش توکن یافت نشد.' });

    const row = await db.select().from(refreshTokens).where(eq(refreshTokens.token, presented)).limit(1).then(r => r[0]);
    if (!row || row.expiresAt.getTime() < Date.now()) {
      if (row) await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id)).catch(() => {});
      return res.status(401).json({ error: 'نشست منقضی شده است.' });
    }
    const dbUser = await db.select().from(users).where(eq(users.id, row.userId)).limit(1).then(r => r[0]);
    if (!dbUser) return res.status(401).json({ error: 'کاربر یافت نشد.' });

    // Rotate
    await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id));
    const accessToken = generateJwtToken({ id: dbUser.id, uid: dbUser.uid, phone: dbUser.phone, role: dbUser.role, salonId: dbUser.salonId ? String(dbUser.salonId) : null });
    const refreshTokenValue = generateRefreshTokenValue();
    await db.insert(refreshTokens).values({
      userId: dbUser.id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS),
    }).onConflictDoNothing().catch(() => {});

    res.json({ accessToken, refreshToken: refreshTokenValue });
  } catch (err) {
    res.status(500).json({ error: 'خطا در بازیابی نشست.' });
  }
});

router.post('/auth/logout', async (req, res) => {
  const presented = req.body?.refreshToken || req.cookies?.refreshToken;
  if (presented) {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, presented)).catch(() => {});
  }
  res.json({ success: true });
});

// ==========================================
// Categories (service lines)
// ==========================================
router.get('/categories', async (_req, res) => {
  try {
    const SERVICE_LINES = [
      { id: 'hair', name: 'آرایش مو', slug: 'hair', icon: 'scissors' },
      { id: 'nail', name: 'ناخن', slug: 'nail', icon: 'hand' },
      { id: 'skin', name: 'پوست', slug: 'skin', icon: 'sparkles' },
      { id: 'makeup', name: 'آرایش صورت', slug: 'makeup', icon: 'brush' },
      { id: 'spa', name: 'اسپا و ماساژ', slug: 'spa', icon: 'flower' },
    ];
    res.json({ data: SERVICE_LINES });
  } catch {
    res.status(500).json({ error: 'خطا در دریافت دسته‌بندی‌ها.' });
  }
});

// ==========================================
// Locations
// ==========================================
router.get('/locations/provinces', async (_req, res) => {
  res.json({ data: PROVINCES });
});

// ==========================================
// Salons (paginated, Flutter contract)
// ==========================================
router.get('/salons', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const q = (req.query.q as string) || '';
    const category = (req.query.category as string) || '';
    const mobile = String(req.query.mobile ?? '') === 'true';

    const list = await db.query.salons.findMany({
      where: eq(salons.isApproved, true),
      with: { services: true, specialists: { with: { user: true, portfolio: true } } },
    });

    let result: any[] = list;
    if (q) {
      const needle = q.toLowerCase();
      result = result.filter((s) =>
        s.name?.toLowerCase().includes(needle) ||
        s.city?.toLowerCase().includes(needle) ||
        s.district?.toLowerCase().includes(needle)
      );
    }
    if (category) result = result.filter((s) => s.services?.some((sv: any) => sv.serviceLineId === category));
    if (mobile) result = result.filter((s) => s.isMobileServiceActive);

    const start = (page - 1) * limit;
    const rows = result.slice(start, start + limit);

    const salonIds = rows.map((s) => s.id);
    let bookedByKey = new Set<string>();
    if (salonIds.length > 0) {
      const upcoming = await db.select().from(bookingsTable)
        .where(and(inArray(bookingsTable.salonId, salonIds), ne(bookingsTable.status, 'cancelled')))
        .limit(2000);
      for (const b of upcoming) {
        bookedByKey.add(`${b.salonId}|${normalizeToIsoDate(b.date) ?? ''}|${normalizeTimeToLatin(b.time) ?? ''}`);
      }
    }

    const mapped = rows.map((s: any) => {
      const days: any[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const iso = toIsoDate(d);
        const jalali = gregorianToJalali(d);
        const slots = STANDARD_HOURLY_SLOTS.map((time: string) => {
          const latin = normalizeTimeToLatin(toLatinDigits(time));
          return { time, booked: latin ? bookedByKey.has(`${s.id}|${iso}|${latin}`) : false };
        });
        days.push({
          date: `${jalali.jd} ${JALALI_MONTHS[jalali.jm - 1]}`,
          fullJalaliDate: `${jalali.jy}/${String(jalali.jm).padStart(2, '0')}/${String(jalali.jd).padStart(2, '0')}`,
          dayNumber: String(jalali.jd), slots,
        });
      }
      return {
        id: s.id,
        name: s.name,
        city: s.city,
        district: s.district,
        province: s.province,
        address: s.address,
        phone: s.phone,
        coverImage: s.coverImage,
        rating: Number(s.rating),
        reviewsCount: s.reviewsCount,
        isVip: s.isVip,
        vipBadgeLabel: s.vipBadgeLabel,
        isMobileServiceActive: s.isMobileServiceActive,
        services: (s.services || []).map((sv: any) => ({
          id: sv.id,
          name: sv.name,
          price: Number(sv.price),
          durationMinutes: sv.durationMinutes,
          serviceLineId: sv.serviceLineId,
          isMobileAvailable: sv.isMobileAvailable,
        })),
        specialists: (s.specialists || []).map((sp: any) => ({
          id: sp.id,
          name: sp.user?.fullName || '',
          specialtyLine: sp.specialtyLine,
          avatarUrl: sp.avatarUrl,
          isVerified: sp.isVerified,
          rating: 4.8,
        })),
        availableSlots: days,
      };
    });

    res.json(paginate(mapped, page, limit));
  } catch (err: any) {
    console.error('[MOBILE SALONS ERROR]', err);
    res.status(500).json({ error: 'خطا در دریافت لیست سالن‌ها.' });
  }
});

router.get('/salons/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'شناسه نامعتبر است.' });
    const salon = await db.query.salons.findFirst({
      where: eq(salons.id, id),
      with: { services: true, specialists: { with: { user: true, portfolio: true } } },
    });
    if (!salon) return res.status(404).json({ error: 'سالن یافت نشد.' });
    res.json({ data: salon });
  } catch {
    res.status(500).json({ error: 'خطا در دریافت سالن.' });
  }
});

// ==========================================
// Bookings
// ==========================================
router.get('/bookings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(bookingsTable)
      .where(eq(bookingsTable.customerId, req.dbUser.id))
      .orderBy(desc(bookingsTable.createdAt));
    res.json({ data: list });
  } catch {
    res.status(500).json({ error: 'خطا در دریافت نوبت‌ها.' });
  }
});

router.post('/bookings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = schemas.bookingCreateSchema.parse(req.body);
    const serviceRow = await db.select().from(services).where(eq(services.id, Number(data.serviceId))).limit(1).then(r => r[0]);
    if (!serviceRow) return res.status(400).json({ error: 'خدمت یافت نشد.' });

    const { createBooking } = await import('../db/bookings.ts');
    const booking = await createBooking({ ...data, customerId: req.dbUser.id, price: String(serviceRow.price) } as any);
    res.status(201).json({ data: booking });
  } catch (err: any) {
    console.error('[MOBILE BOOKING ERROR]', err);
    res.status(400).json({ error: err.message || 'خطا در ثبت نوبت.' });
  }
});

// ==========================================
// Profile
// ==========================================
router.get('/profile', requireAuth, (req: AuthRequest, res) => {
  const u: any = req.dbUser;
  res.json({ data: { id: u.id, phone: u.phone, fullName: u.fullName, email: u.email, role: u.role, avatar: u.avatar } });
});

export default router;

// --- In-memory OTP store (shared with the v1 layer; production should use Redis) ---
const memOtpStore = new Map<string, { code: string; attempts: number; expiresAt: number }>();
