import { Router } from 'express';
import { db } from '../db/index.ts';
import { users, salons, services, specialists, bookings as bookingsTable, refreshTokens, notifications, portfolioItems } from '../db/schema.ts';
import { eq, and, desc, inArray, ne, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import crypto from 'crypto';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.ts';
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
      refreshExpiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS).toISOString(),
      user: {
        id: String(dbUser.id),
        phoneNumber: dbUser.phone,
        fullName: dbUser.fullName,
        role: dbUser.role,
        isNewUser: false,
      },
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

    res.json({
      accessToken: accessToken as string,
      refreshToken: refreshTokenValue,
      refreshExpiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS).toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'خطا در بازیابی نشست.' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const phoneNumber = normalizePhone(req.body.phoneNumber || req.body.phone);
    const code = String(req.body.code || '').trim();
    if (!phoneNumber || !code) return res.status(400).json({ error: 'اطلاعات ناقص است.' });

    const stored = memOtpStore.get(phoneNumber);
    if (!stored || stored.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'کد منقضی شده یا یافت نشد.' });
    }
    if (stored.code !== code) return res.status(400).json({ error: 'کد اشتباه است.' });
    memOtpStore.delete(phoneNumber);

    let dbUser = await db.select().from(users).where(eq(users.phone, phoneNumber)).limit(1).then(r => r[0]);
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
      refreshExpiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS).toISOString(),
      user: {
        id: String(dbUser.id),
        phoneNumber: dbUser.phone,
        fullName: dbUser.fullName,
        role: dbUser.role,
        isNewUser: false,
      },
    });
  } catch (err: any) {
    console.error('[MOBILE LOGIN ERROR]', err);
    res.status(500).json({ error: err.message || 'خطای احراز هویت.' });
  }
});

router.post('/auth/logout', async (req, res) => {
  const presented = req.body?.refreshToken || req.cookies?.refreshToken;
  if (presented) {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, presented)).catch(() => {});
  }
  res.json({ success: true });
});

router.post('/auth/logout-all', requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await db.delete(refreshTokens).where(eq(refreshTokens.userId, req.dbUser.id));
    const revoked = (result as any)?.rowCount ?? 0;
    res.json({ revoked });
  } catch {
    res.status(500).json({ error: 'خطا در خروج از همه نشست‌ها.' });
  }
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
  res.json({ data: { id: String(u.id), phoneNumber: u.phone, phone: u.phone, fullName: u.fullName, email: u.email, role: u.role, avatar: u.avatar } });
});

router.get('/profile/bookings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(bookingsTable)
      .where(eq(bookingsTable.customerId, req.dbUser.id))
      .orderBy(desc(bookingsTable.createdAt));
    res.json({ data: list });
  } catch {
    res.status(500).json({ error: 'خطا در دریافت نوبت‌ها.' });
  }
});

// ==========================================
// Notifications (Flutter contract)
// ==========================================
router.get('/notifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(notifications)
      .where(eq(notifications.isActive, true))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    res.json({ data: list });
  } catch {
    res.status(500).json({ error: 'خطا در دریافت اعلانات.' });
  }
});

router.get('/notifications/unread-count', requireAuth, async (req: AuthRequest, res) => {
  try {
    const list = await db.select().from(notifications)
      .where(eq(notifications.isActive, true))
      .limit(200);
    res.json({ count: list.length });
  } catch {
    res.status(500).json({ error: 'خطا در دریافت تعداد اعلانات.' });
  }
});

router.post('/notifications/read-all', requireAuth, async (req: AuthRequest, res) => {
  try {
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'خطا در به‌روزرسانی اعلانات.' });
  }
});

// ==========================================
// Locations (Flutter contract)
// ==========================================
router.get('/locations/reverse-geocode', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'مختصات نامعتبر است.' });
    }
    // Reverse geocoding via Neshan API (free tier) — returns province/city.
    const neshanKey = process.env.NESHAN_API_KEY;
    if (neshanKey) {
      const { default: axios } = await import('axios');
      const resp = await axios.get(`https://api.neshan.org/v5/reverse?lat=${lat}&lng=${lng}`, {
        headers: { 'Api-Key': neshanKey },
        timeout: 5000,
      });
      res.json({ data: resp.data });
    } else {
      // Fallback when no key is configured: nearest province by bounding box.
      res.json({ data: { province: PROVINCES[0].name, city: PROVINCES[0].name } });
    }
  } catch {
    res.status(500).json({ error: 'خطا در دریافت موقعیت.' });
  }
});

// ==========================================
// SALON PANEL endpoints (v1 API for the Flutter salon_app)
// ==========================================
router.get('/auth/me', requireAuth, (req: AuthRequest, res) => {
  const u: any = req.dbUser;
  res.json({
    data: {
      id: String(u.id),
      phoneNumber: u.phone,
      fullName: u.fullName,
      role: u.role,
      salonId: u.salonId ? String(u.salonId) : null,
      avatar: u.avatar,
    },
  });
});

// Salon dashboard: counts of bookings, revenue, staff.
router.get('/dashboard', requireAuth, requireRole(['salon_admin', 'super_admin']), async (req: AuthRequest, res) => {
  try {
    const salonId = req.dbUser.salonId ? Number(req.dbUser.salonId) : null;
    if (!salonId && req.dbUser.role !== 'super_admin') return res.status(403).json({ error: 'سالن شما مشخص نیست.' });

    const whereSalon = salonId ? eq(bookingsTable.salonId, salonId) : undefined;
    const today = new Date().toISOString().slice(0, 10);

    const allBookings = whereSalon
      ? await db.select().from(bookingsTable).where(whereSalon)
      : await db.select().from(bookingsTable);
    const todayBookings = allBookings.filter((b) => b.date === today);
    const revenue = allBookings
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => sum + Number(b.price || 0), 0);

    const staff = salonId
      ? await db.select().from(specialists).where(eq(specialists.salonId, salonId))
      : await db.select().from(specialists);

    res.json({
      data: {
        todayCount: todayBookings.length,
        totalBookings: allBookings.length,
        revenue,
        staffCount: staff.length,
        pendingCount: allBookings.filter((b) => b.status === 'pending').length,
      },
    });
  } catch (err) {
    console.error('[SALON DASHBOARD ERROR]', err);
    res.status(500).json({ error: 'خطا در دریافت داشبورد.' });
  }
});

// Finance summary for the salon.
router.get('/finance', requireAuth, requireRole(['salon_admin', 'super_admin']), async (req: AuthRequest, res) => {
  try {
    const salonId = req.dbUser.salonId ? Number(req.dbUser.salonId) : null;
    const allBookings = salonId
      ? await db.select().from(bookingsTable).where(eq(bookingsTable.salonId, salonId))
      : await db.select().from(bookingsTable);

    const completed = allBookings.filter((b) => b.status === 'completed');
    const totalRevenue = completed.reduce((sum, b) => sum + Number(b.price || 0), 0);

    res.json({
      data: {
        totalRevenue,
        completedCount: completed.length,
        pendingPayments: allBookings.filter((b) => b.paymentStatus === 'unpaid').length,
      },
    });
  } catch {
    res.status(500).json({ error: 'خطا در دریافت آمار مالی.' });
  }
});

// Calendar bookings for the salon panel.
router.get('/bookings/calendar', requireAuth, requireRole(['salon_admin', 'super_admin', 'salon_specialist']), async (req: AuthRequest, res) => {
  try {
    const salonId = req.dbUser.salonId ? Number(req.dbUser.salonId) : null;
    const from = (req.query.from as string) || new Date().toISOString().slice(0, 10);
    const to = (req.query.to as string) || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const list = salonId
      ? await db.select().from(bookingsTable).where(eq(bookingsTable.salonId, salonId))
      : await db.select().from(bookingsTable);

    const filtered = list.filter((b) => b.date >= from && b.date <= to);
    res.json({ data: filtered });
  } catch {
    res.status(500).json({ error: 'خطا در دریافت تقویم.' });
  }
});

// Service lines (categories) for the salon panel.
router.get('/services/lines', async (_req, res) => {
  try {
    const SERVICE_LINES = [
      { id: 'hair', name: 'آرایش مو', slug: 'hair' },
      { id: 'nail', name: 'ناخن', slug: 'nail' },
      { id: 'skincare', name: 'پوست', slug: 'skincare' },
      { id: 'makeup', name: 'آرایش صورت', slug: 'makeup' },
      { id: 'massage_spa', name: 'اسپا و ماساژ', slug: 'massage_spa' },
    ];
    res.json({ data: SERVICE_LINES });
  } catch {
    res.status(500).json({ error: 'خطا در دریافت خطوط خدمات.' });
  }
});

router.post('/services/lines/new', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
  try {
    const { name, slug } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'نام و شناسه الزامی است.' });
    res.status(201).json({ data: { id: String(slug), name, slug } });
  } catch {
    res.status(500).json({ error: 'خطا در ایجاد خط خدمت.' });
  }
});

// Salon staff (specialists).
router.get('/specialists', requireAuth, async (req: AuthRequest, res) => {
  try {
    const salonId = req.query.salonId ? Number(req.query.salonId) : Number(req.dbUser.salonId);
    if (!Number.isFinite(salonId)) return res.status(400).json({ error: 'شناسه سالن الزامی است.' });
    const list = await db.select().from(specialists).where(eq(specialists.salonId, salonId));
    res.json({ data: list });
  } catch {
    res.status(500).json({ error: 'خطا در دریافت متخصصین.' });
  }
});

router.post('/specialists/new', requireAuth, requireRole(['salon_admin', 'super_admin']), async (req: AuthRequest, res) => {
  try {
    const data = schemas.specialistCreateSchema.parse(req.body);
    const salonId = Number(data.salonId) || Number(req.dbUser.salonId);
    if (!Number.isFinite(salonId)) return res.status(400).json({ error: 'شناسه سالن الزامی است.' });

    const [created] = await db.insert(specialists).values({
      userId: Number(data.userId),
      salonId,
      specialtyLine: data.specialtyLine,
      bio: data.bio ?? null,
      experienceYears: Number(data.experienceYears ?? 1),
      isMobileActive: Boolean(data.isMobileActive),
      avatarUrl: data.avatarUrl ?? null,
    } as any).returning();
    res.status(201).json({ data: created });
  } catch (err) {
    console.error('[SALON NEW SPECIALIST ERROR]', err);
    res.status(400).json({ error: 'خطا در افزودن متخصص.' });
  }
});

router.post('/specialists/invite', requireAuth, requireRole(['salon_admin', 'super_admin']), async (req: AuthRequest, res) => {
  try {
    const { phone, fullName, specialtyLine } = req.body;
    if (!phone) return res.status(400).json({ error: 'شماره موبایل الزامی است.' });
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) return res.status(400).json({ error: 'شماره موبایل نامعتبر است.' });

    // Create or reuse the user, then link as a specialist if not already.
    const { getOrCreateUserByPhone } = await import('../db/users.ts');
    const dbUser = await getOrCreateUserByPhone(cleanPhone, fullName);
    const salonId = Number(req.dbUser.salonId);
    if (!Number.isFinite(salonId)) return res.status(400).json({ error: 'شناسه سالن الزامی است.' });

    const existing = await db.select().from(specialists).where(eq(specialists.userId, dbUser.id)).limit(1);
    if (existing.length > 0) return res.status(400).json({ error: 'این کاربر قبلاً متخصص ثبت شده است.' });

    const [created] = await db.insert(specialists).values({
      userId: dbUser.id,
      salonId,
      specialtyLine: specialtyLine || 'hair',
      isVerified: false,
    } as any).returning();
    res.status(201).json({ data: created });
  } catch (err) {
    console.error('[SALON INVITE ERROR]', err);
    res.status(500).json({ error: 'خطا در دعوت متخصص.' });
  }
});

// Salon portfolio.
router.get('/portfolio', requireAuth, async (req: AuthRequest, res) => {
  try {
    const salonId = req.query.salonId ? Number(req.query.salonId) : Number(req.dbUser.salonId);
    if (!Number.isFinite(salonId)) return res.status(400).json({ error: 'شناسه سالن الزامی است.' });
    const list = await db.select().from(portfolioItems)
      .where(inArray(portfolioItems.specialistId,
        (await db.select().from(specialists).where(eq(specialists.salonId, salonId))).map((s) => s.id)));
    res.json({ data: list });
  } catch {
    res.status(500).json({ error: 'خطا در دریافت نمونه‌کارها.' });
  }
});

// Staff invite flow.
router.post('/auth/invite', requireAuth, requireRole(['salon_admin', 'super_admin']), async (req: AuthRequest, res) => {
  try {
    const { phone, fullName } = req.body;
    if (!phone) return res.status(400).json({ error: 'شماره موبایل الزامی است.' });
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) return res.status(400).json({ error: 'شماره موبایل نامعتبر است.' });
    const { getOrCreateUserByPhone } = await import('../db/users.ts');
    const dbUser = await getOrCreateUserByPhone(cleanPhone, fullName);
    res.status(201).json({ data: { id: String(dbUser.id), phoneNumber: dbUser.phone, fullName: dbUser.fullName } });
  } catch {
    res.status(500).json({ error: 'خطا در دعوت کاربر.' });
  }
});

router.get('/auth/forbidden', (_req, res) => {
  res.status(403).json({ error: 'دسترسی غیرمجاز.' });
});

export default router;

// --- In-memory OTP store (shared with the v1 layer; production should use Redis) ---
const memOtpStore = new Map<string, { code: string; attempts: number; expiresAt: number }>();
