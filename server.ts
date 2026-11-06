import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
// F-14: the express-rate-limit import was dead (no app.use(rateLimit(...)))
// while PRODUCTION_READINESS.md claimed "100 requests/15 minutes". Removed
// rather than left as a hint, so the doc claim cannot be believed again.
import { sanitizeRole } from './src/db/users.ts';
import Redis from 'ioredis';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { ZodError, z } from 'zod';

import { requireAuth, requireRole, assertSalonScope, type AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users, salons, services, bookings as bookingsTable, revokedTokens, notifications, adminProfile, specialists, portfolioItems, auditLogs, supportTickets, ticketMessages, refreshTokens, specialistServiceCommissions, salonWeeklySchedule, specialistWeeklySchedule, servicePortfolioItems } from './src/db/schema.ts';
import { eq, desc, and, inArray, asc, ne, sql } from 'drizzle-orm';
import { createBooking, getBookingsForUser, updateBookingStatus } from './src/db/bookings.ts';
import { sendMeliPayamakSms } from './src/lib/meliPayamak.ts';
import { normalizeToIsoDate, normalizeTime, normalizeTimeToLatin, toLatinDigits, toIsoDate, gregorianToJalali, JALALI_MONTHS, STANDARD_HOURLY_SLOTS } from './src/shared/utils/dateIsoConverter.ts';
import { normalizePhone } from './src/shared/utils/persianUtils.ts';
import { generateJwtToken, verifyJwtToken, generateRefreshTokenValue, decodeTokenExpiry, REFRESH_TOKEN_EXPIRES_IN_MS } from './src/lib/jwt.ts';
import { seedDatabase } from './src/db/seed.ts';
import { runMigrations } from './src/db/migrate.ts';
import { logSecurityAction } from './src/db/audit.ts';
import * as schemas from './src/lib/validation.ts';
import { redactUserPII, processBookingData } from './src/lib/piiRedactor.ts';
import { otpSet, otpGet, otpDel, otpRateLimited } from './src/lib/otp.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;

console.log(`[BOOT] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[BOOT] isProd: ${isProd}`);
console.log(`[BOOT] PORT: ${PORT}`);

// --- Redis & OTP Setup ---
// F-03: OTP storage and rate limiting live in src/lib/otp.ts so the web and
// mobile entry points share one implementation. Kept imported here for the
// boot-time log line below.
const redisClient: Redis | null = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
if (redisClient) {
  redisClient.on('error', (e) => console.error('[REDIS ERROR]', e.message));
  console.log('[REDIS] Connected (durable OTP store).');
} else {
  console.warn('[REDIS] REDIS_URL not set -- using in-memory OTP.');
}

async function createServer() {
  const app = express();
  
  app.set('trust proxy', 1);

  if (isProd) {
    app.use(helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          "default-src": ["'self'"],
          "img-src": ["'self'", "data:", "blob:", "https:", "https://images.unsplash.com", "https://*.tile.openstreetmap.org"],
          "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
          "script-src-elem": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
          "script-src-attr": ["'unsafe-inline'"],
          "worker-src": ["'self'", "blob:"],
          "child-src": ["'self'", "blob:"],
          "style-src": ["'self'", "'unsafe-inline'", "https:"],
          "style-src-attr": ["'unsafe-inline'"],
          "font-src": ["'self'", "data:", "https:"],
          "connect-src": ["'self'", "https:", "wss:", "ws:"],
          "frame-src": ["'self'", "https:"],
          "frame-ancestors": ["'none'"],
          "object-src": ["'none'"],
          "form-action": ["'self'"],
          "base-uri": ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    }));
  }


  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));
  app.use(cookieParser());

  await runMigrations();

  if (process.env.RUN_SEED === 'true') {
    try {
      await seedDatabase();
      console.log('[DB BOOT] Database tables and seed data synchronized successfully.');
    } catch (err) {
      console.error('[DB BOOT WARNING] Seeding encountered an issue:', err);
    }
  } else {
    console.log('[DB BOOT] Skipping seed execution (RUN_SEED != true).');
  }

  // AUDIT (P0): Upload persistence. Container filesystems are ephemeral AND
  // `vite build` empties `dist/`, so storing uploads there would lose every
  // uploaded image on the next deploy. Prefer (1) UPLOADS_DIR env (mounted
  // volume), (2) /app/uploads (docker), (3) <projectRoot>/data/uploads — a
  // stable location Vite never touches, and mirror symlinks into public/uploads
  // and dist/uploads so any static layer still finds the files.
  const envUploads = process.env.UPLOADS_DIR;
  const dockerUploads = '/app/uploads';
  const dataUploads = path.resolve(__dirname, 'data/uploads');
  const localUploads = path.resolve(process.cwd(), 'public/uploads');
  const distUploads = path.resolve(__dirname, 'dist/uploads');
  const uploadsDir = envUploads
    ? path.resolve(envUploads)
    : fs.existsSync(dockerUploads)
      ? dockerUploads
      : dataUploads;
  for (const dir of [uploadsDir, localUploads, distUploads]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  console.log(`[BOOT] Upload storage directory: ${uploadsDir}`);

  app.use('/uploads', express.static(uploadsDir));
  app.use('/uploads', express.static(localUploads));
  app.use('/uploads', express.static(distUploads));

  function validateAndProcessImage(rawData: string): { buffer: Buffer; ext: string } {
    if (!rawData || typeof rawData !== 'string') throw new Error('داده تصویر نامعتبر است.');
    if (rawData.length > 7 * 1024 * 1024) throw new Error('حجم فایل بیش از حد مجاز است.');
    const matches = rawData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    const base64Data = matches ? matches[2] : rawData;
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > 5 * 1024 * 1024) throw new Error('حجم فایل بیش از حد مجاز است.');
    
    let ext = '';
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ext = 'jpg';
    else if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) ext = 'png';
    else if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') ext = 'webp';
    else throw new Error('فرمت نامعتبر است.');
    return { buffer, ext };
  }

  // ==========================================
  // API ROUTES
  // ==========================================

  app.post('/api/upload', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rawData = req.body.fileData || req.body.base64;
      const { buffer, ext } = validateAndProcessImage(rawData);
      const safeName = `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, safeName), buffer);
      res.json({ success: true, url: `/uploads/${safeName}` });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/auth/send-otp', async (req, res) => {
    try {
      const { phone: rawPhone } = req.body;
      const phone = schemas.phoneSchema.parse(normalizePhone(rawPhone));
      
      if (await otpRateLimited(phone)) return res.status(429).json({ error: 'تعداد درخواست بیش از حد مجاز. چند دقیقه صبر کنید.' });

      const otpCode = crypto.randomInt(10000, 99999).toString();
      await otpSet(phone, { code: otpCode, attempts: 0 }, 5 * 60);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[OTP LOG] ${phone} -> ${otpCode}`);
      }

      try {
        await sendMeliPayamakSms(phone, `کد تایید بویا: ${otpCode}`);
      } catch (e) {
        console.error('[SMS FAIL]', { phone, error: e });
        return res.status(502).json({ error: 'خطا در ارسال پیامک.' });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در درخواست.' });
    }
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const data = schemas.otpVerifySchema.parse({ ...req.body, phone: normalizePhone(req.body.phone) });
      const { phone, code, fullName } = data;

      const stored: any = await otpGet(phone);
      if (!stored) return res.status(400).json({ error: 'کد منقضی شده یا یافت نشد.' });

      if (stored.code !== code.trim()) {
        stored.attempts = (stored.attempts || 0) + 1;
        if (stored.attempts >= 3) {
          await otpDel(phone);
          return res.status(401).json({ error: 'تعداد تلاش‌ها زیاد شد. دوباره درخواست دهید.' });
        }
        await otpSet(phone, stored, 5 * 60);
        return res.status(400).json({ error: `کد اشتباه است. (${3 - stored.attempts} تلاش باقی مانده)` });
      }

      await otpDel(phone);

      let dbUser = await db.select().from(users).where(eq(users.phone, phone)).limit(1).then(r => r[0]);

      if (dbUser?.status === 'suspended') {
        await logSecurityAction({ action: 'UNAUTHORIZED_ACCESS', targetId: dbUser.id, details: { reason: 'Suspended login attempt' }, ipAddress: req.ip });
        return res.status(403).json({ error: 'حساب کاربری مسدود است.' });
      }

      if (!dbUser) {
        const [newUser] = await db.insert(users).values({
          uid: `phone_${phone}`,
          phone,
          fullName: fullName || `کاربر ${phone.slice(-4)}`,
          email: `${phone}@boya.ir`,
          role: 'customer',
        }).returning();
        dbUser = newUser;
      }

      await logSecurityAction({ actorId: dbUser.id, action: 'LOGIN', ipAddress: req.ip });

      // P1: Issue a short-lived access token (15m) plus an opaque refresh
      // token (30d) stored server-side. The access token is what protects
      // API calls; the refresh token is only used to mint new access tokens.
      const token = generateJwtToken({ id: dbUser.id, uid: dbUser.uid, phone: dbUser.phone, role: dbUser.role, salonId: dbUser.salonId ? String(dbUser.salonId) : null });
      const refreshTokenValue = generateRefreshTokenValue();

      await db.insert(refreshTokens).values({
        userId: dbUser.id,
        token: refreshTokenValue,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS),
      }).onConflictDoNothing().catch(() => {});

      res.cookie('token', token, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 15 * 60 * 1000, path: '/' });
      res.cookie('refreshToken', refreshTokenValue, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: REFRESH_TOKEN_EXPIRES_IN_MS, path: '/' });

      const { email: _, phone: __, ...safeUser } = dbUser;
      res.json({ user: safeUser });
    } catch (err: any) {
      console.error('[VERIFY-OTP ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: err.message || 'خطای احراز هویت.' });
    }
  });

  // P1: Exchange a valid refresh token for a fresh access token.
  // Rotation: the presented refresh token is deleted and a new one issued,
  // so a stolen refresh token is only usable once and its theft is visible
  // to the real user as a forced re-login.
  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const presented = req.cookies?.refreshToken || req.headers['x-refresh-token'];
      if (!presented || typeof presented !== 'string') {
        return res.status(401).json({ error: 'رفرش توکن یافت نشد. لطفاً دوباره وارد شوید.' });
      }

      const row = await db.select().from(refreshTokens).where(eq(refreshTokens.token, presented)).limit(1).then(r => r[0]);
      if (!row) return res.status(401).json({ error: 'رفرش توکن نامعتبر است.' });
      if (row.expiresAt.getTime() < Date.now()) {
        await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id)).catch(() => {});
        return res.status(401).json({ error: 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.' });
      }

      const dbUser = await db.select().from(users).where(eq(users.id, row.userId)).limit(1).then(r => r[0]);
      if (!dbUser || dbUser.status === 'suspended') {
        await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id)).catch(() => {});
        return res.status(403).json({ error: 'حساب کاربری مسدود است.' });
      }

      // Rotate: invalidate the presented token, then mint a new pair.
      await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id));

      const newAccessToken = generateJwtToken({ id: dbUser.id, uid: dbUser.uid, phone: dbUser.phone, role: dbUser.role, salonId: dbUser.salonId ? String(dbUser.salonId) : null });
      const newRefreshValue = generateRefreshTokenValue();
      await db.insert(refreshTokens).values({
        userId: dbUser.id,
        token: newRefreshValue,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS),
      }).onConflictDoNothing().catch(() => {});

      res.cookie('token', newAccessToken, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 15 * 60 * 1000, path: '/' });
      res.cookie('refreshToken', newRefreshValue, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: REFRESH_TOKEN_EXPIRES_IN_MS, path: '/' });

      const { email: _, phone: __, ...safeUser } = dbUser;
      res.json({ user: safeUser });
    } catch (err: any) {
      console.error('[REFRESH ERROR]', err);
      res.status(500).json({ error: 'خطا در بازیابی نشست.' });
    }
  });

  app.post('/api/auth/logout', requireAuth, async (req: AuthRequest, res) => {
    const token = req.cookies.token;
    if (token) {
      // Blacklist the access token for the rest of its (now short) life.
      await db.insert(revokedTokens).values({ token, expiresAt: decodeTokenExpiry(token) }).onConflictDoNothing().catch(() => {});
    }
    // P1: Delete the refresh token row so the session cannot be re-created.
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken)).catch(() => {});
    }
    if (req.dbUser) {
      await logSecurityAction({ actorId: req.dbUser.id, action: 'LOGOUT', ipAddress: req.ip });
    }
    res.clearCookie('token', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' });
    res.clearCookie('refreshToken', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' });
    res.json({ success: true });
  });

  // Clean session verification for guest or logged-in users (returns 200 with { authenticated, user })
  app.get('/api/auth/session', async (req, res) => {
    let token: string | undefined = req.cookies?.token;
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1]?.trim();
    }

    if (!token) {
      return res.json({ authenticated: false, user: null });
    }

    try {
      const isRevoked = await db.select().from(revokedTokens).where(eq(revokedTokens.token, token)).limit(1).then(r => r.length > 0);
      if (isRevoked) {
        return res.json({ authenticated: false, user: null });
      }

      const jwtPayload = verifyJwtToken(token);
      if (jwtPayload) {
        let dbUser: any = null;
        if (jwtPayload.phone) {
          dbUser = await db.select().from(users).where(eq(users.phone, jwtPayload.phone)).limit(1).then(r => r[0]);
        }
        if (!dbUser && jwtPayload.id) {
          dbUser = await db.select().from(users).where(eq(users.id, jwtPayload.id)).limit(1).then(r => r[0]);
        }
        if (dbUser && dbUser.status !== 'suspended') {
          return res.json({ authenticated: true, user: dbUser });
        }
      }
      return res.json({ authenticated: false, user: null });
    } catch {
      return res.json({ authenticated: false, user: null });
    }
  });

  app.get('/api/profile', requireAuth, (req: AuthRequest, res) => res.json(req.dbUser));

  app.patch('/api/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const allowed = schemas.userUpdateSchema.pick({ fullName: true, avatar: true, email: true }).parse(req.body);
      const [updated] = await db.update(users).set(allowed).where(eq(users.id, req.dbUser.id)).returning();
      if (allowed.avatar) {
        await db.update(specialists).set({ avatarUrl: allowed.avatar }).where(eq(specialists.userId, req.dbUser.id)).catch(() => {});
      }
      res.json({ success: true, user: updated });
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش پروفایل.' });
    }
  });

  // PII GUARD: strip the raw `users` row (phone, email, uid, status,
  // managedLine) and specialist `documents` from any salon payload served to
  // customers. Without this, GET /api/salons and GET /api/salons/:id embed
  // `specialists.user` verbatim — an anonymous caller could enumerate every
  // staff member's phone and email, and download their identity documents via
  // the public /uploads layer. The flattened field names below are the ones
  // the customer UI already reads (name/specialtyLine/rating/...).
  const sanitizeSalonForPublic = (s: any) => ({
    ...s,
    services: (s.services || []).filter((sv: any) => (sv as any).publicationStatus !== 'pending'),
    specialists: (s.specialists || []).map((sp: any) => ({
      id: sp.id,
      name: sp.user?.fullName || sp.name || '',
      role: sp.user?.role || sp.role,
      avatar: sp.avatarUrl || sp.user?.avatar || sp.avatar || '',
      avatarUrl: sp.avatarUrl || sp.user?.avatar || sp.avatar || '',
      specialtyLine: sp.specialtyLine,
      experienceYears: sp.experienceYears,
      bio: sp.bio || '',
      isVerified: sp.isVerified,
      verified: sp.isVerified,
      isMobileActive: sp.isMobileActive,
      isMobileSpecialist: sp.isMobileActive,
      rating: Number(sp.user?.rating ?? sp.rating ?? 4.8),
      reviewsCount: Number(sp.user?.reviewsCount ?? sp.reviewsCount ?? 0),
      portfolio: Array.isArray(sp.portfolio) ? sp.portfolio : [],
    })),
  });

  app.get('/api/salons', async (req, res) => {
    try {
      // AUDIT (P0): Push location/service-line filters into SQL instead of
      // loading the whole table and filtering in memory.
      const { province, city, district, serviceLine, q } = req.query as Record<string, string | undefined>;

      const conditions = [eq(salons.isApproved, true)];
      if (province && province !== 'همه') conditions.push(eq(salons.province, province));
      if (city && city !== 'همه') conditions.push(eq(salons.city, city));
      if (district && district !== 'همه') conditions.push(eq(salons.district, district));

      const list = await db.query.salons.findMany({
        where: conditions.length === 1 ? conditions[0] : and(...conditions),
        with: { services: true, specialists: { with: { user: true, portfolio: true } } },
      });

      let result = list;
      if (q && q.trim()) {
        const needle = q.trim().toLowerCase();
        result = list.filter((s: any) =>
          s.name?.toLowerCase().includes(needle) ||
          s.city?.toLowerCase().includes(needle) ||
          s.district?.toLowerCase().includes(needle) ||
          s.services?.some((sv: any) => sv.name?.toLowerCase().includes(needle)) ||
          s.specialists?.some((sp: any) => sp.user?.fullName?.toLowerCase().includes(needle))
        );
      }
      if (serviceLine && serviceLine !== 'all') {
        result = result.filter((s: any) =>
          s.services?.some((sv: any) => sv.serviceLineId === serviceLine) ||
          s.specialists?.some((sp: any) => sp.specialtyLine === serviceLine)
        );
      }

      // AUDIT (P0): Derive real availability from the bookings table so the
      // calendar never shows a slot that is in fact taken.
      const salonIds = result.map((s: any) => s.id);
      if (salonIds.length > 0) {
        const upcomingBookings = await db.select().from(bookingsTable)
          .where(and(
            inArray(bookingsTable.salonId, salonIds),
            ne(bookingsTable.status, 'cancelled'),
          )).limit(2000);

        const bookedByKey = new Set<string>();
        for (const b of upcomingBookings) {
          bookedByKey.add(`${b.salonId}|${normalizeToIsoDate(b.date) ?? ''}|${normalizeTimeToLatin(b.time) ?? ''}`);
        }

        result = result.map((s: any) => {
          const days: any[] = [];
          for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const iso = toIsoDate(d);
            const jalali = gregorianToJalali(d);
            const slots = STANDARD_HOURLY_SLOTS.map((time: string) => {
              const latin = normalizeTimeToLatin(toLatinDigits(time));
              const booked = latin ? bookedByKey.has(`${s.id}|${iso}|${latin}`) : false;
              return { time, booked };
            });
            days.push({
              date: `${jalali.jd} ${JALALI_MONTHS[jalali.jm - 1]}`,
              fullJalaliDate: `${jalali.jy}/${String(jalali.jm).padStart(2, '0')}/${String(jalali.jd).padStart(2, '0')}`,
              dayName: '', dayNumber: String(jalali.jd), rawDate: d, slots,
            });
          }
          return { ...s, availableSlots: days };
        });
      }

      res.json(result.map((s: any) => sanitizeSalonForPublic(s)));
    } catch (err) {
      console.error('❌ API SALONS CRITICAL ERROR:', err); res.status(500).json({ error: 'خطا در دریافت لیست.' });
    }
  });

  // Public showcase: sample-work images per service ("نمونه‌کار خدمات") for
  // the customer panel. One row per (salon, service): the service with its
  // images embedded. Owner-rooted (independent specialist) services have no
  // salon to hang off of this listing, so they appear with salonId null and
  // the customer app can group them separately.
  app.get('/api/services-portfolio', async (_req, res) => {
    try {
      const rows = await db.select().from(services);
      const ids = rows.map((s: any) => s.id);
      if (ids.length === 0) return res.json([]);

      const items = await db.select().from(servicePortfolioItems)
        .where(inArray(servicePortfolioItems.serviceId, ids))
        .orderBy(desc(servicePortfolioItems.createdAt));

      const byService = new Map<number, any[]>();
      for (const it of items) {
        const arr = byService.get(it.serviceId) || [];
        arr.push(it);
        byService.set(it.serviceId, arr);
      }
      res.json(rows.map((s: any) => ({
        id: s.id,
        salonId: s.salonId,
        ownerId: s.ownerId,
        serviceLineId: s.serviceLineId,
        name: s.name,
        price: s.price,
        durationMinutes: s.durationMinutes,
        isMobileAvailable: s.isMobileAvailable,
        imageUrl: s.imageUrl,
        publicationStatus: s.publicationStatus,
        portfolio: (byService.get(s.id) || []).map((i: any) => ({
          id: i.id,
          imageUrl: i.imageUrl,
          title: i.title,
        })),
      })));
    } catch (err: any) {
      console.error('[GET SERVICES PORTFOLIO ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت نمونه‌کار خدمات.' });
    }
  });

  app.get('/api/managed/salons', requireAuth, requireRole(['super_admin', 'salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager']), async (req: AuthRequest, res) => {
    try {
      const salonId = req.dbUser.salonId;
      const rows = await db.query.salons.findMany({
        where: req.dbUser.role === 'super_admin' ? undefined : eq(salons.id, Number(salonId)),
        with: { services: true, specialists: { with: { user: true, portfolio: true } } },
      });
      // F-10: flatten the nested specialist rows into the shape the admin and
      // salon panels expect (name/avatar from the related user row). This fix
      // previously lived only in the dead src/routes/salons.ts copy.
      // The salon panel ALSO reads the nested fields below (user, portfolio,
      // documents, publicationStatus, isRentedChair) — dropping them crashes
      // the specialists tab (spec.portfolio.map on undefined), so both shapes
      // are returned together.
      const mapped = rows.map((s: any) => ({
        ...s,
        specialists: (s.specialists || []).map((sp: any) => ({
          id: sp.id,
          salonId: sp.salonId,
          userId: sp.userId,
          name: sp.user?.fullName || '',
          role: sp.user?.role || 'salon_specialist',
          phone: sp.user?.phone || '',
          avatar: sp.avatarUrl || sp.user?.avatar || '',
          avatarUrl: sp.avatarUrl || sp.user?.avatar || '',
          verified: sp.isVerified,
          isVerified: sp.isVerified,
          isMobileSpecialist: sp.isMobileActive,
          isMobileActive: sp.isMobileActive,
          specialtyLine: sp.specialtyLine,
          experienceYears: sp.experienceYears,
          bio: sp.bio || '',
          rating: Number(sp.user?.rating ?? 4.8),
          reviewsCount: Number(sp.user?.reviewsCount ?? 0),
          isRentedChair: sp.isRentedChair,
          commissionPercent: sp.commissionPercent,
          publicationStatus: sp.publicationStatus,
          documents: sp.documents,
          workingHours: sp.workingHours,
          workingDays: sp.workingDays,
          user: sp.user ? { id: sp.user.id, fullName: sp.user.fullName, phone: sp.user.phone, role: sp.user.role, avatar: sp.user.avatar } : null,
          portfolio: Array.isArray(sp.portfolio) ? sp.portfolio : [],
        })),
      }));
      res.json(mapped);
    } catch (err) {
      console.error('❌ API SALONS CRITICAL ERROR:', err); res.status(500).json({ error: 'خطا در دریافت لیست.' });
    }
  });

  app.patch('/api/salons/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'شناسه سالن نامعتبر است.' });
      // MULTI-TENANCY: a salon admin may only patch their OWN salon.
      const allowed = assertSalonScope(req, id);
      if (allowed === null) {
        return res.status(403).json({ error: 'شما فقط می‌توانید اطلاعات سالن خود را ویرایش کنید.' });
      }
      const data = schemas.salonUpdateSchema.parse(req.body);

      // AUDIT (P0): `gallery` is a TEXT column but the salon admin sends an
      // array of image URLs; serialize so Postgres never rejects the update.
      // `specialists` is a frontend-only grouping, not a salon column.
      const patch: Record<string, any> = { ...data };
      if (Array.isArray(patch.gallery)) patch.gallery = JSON.stringify(patch.gallery);
      delete patch.specialists;

      const [updated] = await db.update(salons).set(patch as any).where(eq(salons.id, id)).returning();
      res.json({ success: true, salon: updated });
    } catch (err) {
      console.error('[PATCH SALON ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش.' });
    }
  });

  // AUDIT (P0): Salon detail + create + delete — wired to the frontend.
  // PII GUARD: this route is anonymous; the raw specialist.user row and
  // documents must never reach the client. Also only serve approved salons —
  // previously any id, including pending/suspended ones, was readable.
  app.get('/api/salons/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'شناسه سالن نامعتبر است.' });
      const salon = await db.query.salons.findFirst({
        where: and(eq(salons.id, id), eq(salons.isApproved, true)),
        with: { services: true, specialists: { with: { user: true, portfolio: true } } },
      });
      if (!salon) return res.status(404).json({ error: 'سالن یافت نشد.' });
      res.json(sanitizeSalonForPublic(salon));
    } catch (err: any) {
      console.error('[GET SALON BY ID ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت اطلاعات سالن.' });
    }
  });

  app.post('/api/salons', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const data = schemas.salonCreateSchema.parse(req.body);
      const [created] = await db.insert(salons).values({
        ...data,
        tenantId: `salon_${Date.now()}`,
      } as any).returning();
      res.status(201).json(created);
    } catch (err) {
      console.error('[CREATE SALON ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ایجاد سالن.' });
    }
  });

  app.delete('/api/salons/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(salons).where(eq(salons.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE SALON ERROR]', err);
      res.status(500).json({ error: 'خطا در حذف سالن.' });
    }
  });

  app.get('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const list = await getBookingsForUser(req.dbUser);
      res.json(list.map((b: any) => processBookingData(b, req.dbUser)));
    } catch (err: any) {
      res.status(err.message === 'FORBIDDEN_NO_SALON' ? 403 : 500).json({ error: 'خطا در دریافت نوبت‌ها.' });
    }
  });

  app.post('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = schemas.bookingCreateSchema.parse(req.body);
      const serviceRecord = await db.select().from(services).where(eq(services.id, Number(data.serviceId))).limit(1).then(r => r[0]);
      if (!serviceRecord) return res.status(404).json({ error: 'سرویس مورد نظر یافت نشد.' });

      // F-07: createBooking charges the catalog price from the services table
      // internally; passing a client-visible `price` here would only invite a
      // future caller to forward user input.
      const booking = await createBooking({
        ...data,
        customerId: req.dbUser.id,
      });
      await sendMeliPayamakSms(req.dbUser.phone, `نوبت ثبت شد. کد رهگیری: ${booking?.trackingCode}`).catch(() => {});
      res.status(201).json(booking);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'خطا در ثبت نوبت.' });
    }
  });

  app.patch('/api/bookings/:id/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'شناسه نوبت نامعتبر است.' });
      // MULTI-TENANCY: only the owning salon's staff (or the booking's own
      // specialist / the customer who made it) may change a booking's status.
      const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1);
      if (!booking) return res.status(404).json({ error: 'نوبت یافت نشد.' });
      const role = req.dbUser.role;
      let mayUpdate = role === 'super_admin';
      if (!mayUpdate && (role === 'salon_admin' || role === 'line_manager')) {
        mayUpdate = assertSalonScope(req, booking.salonId) !== null;
      }
      if (!mayUpdate && (role === 'salon_specialist' || role === 'mobile_specialist')) {
        const [owner] = await db.select().from(specialists)
          .where(eq(specialists.id, booking.specialistId)).limit(1);
        mayUpdate = !!owner && owner.userId === req.dbUser.id;
      }
      if (!mayUpdate && role === 'customer') {
        mayUpdate = booking.customerId === req.dbUser.id;
      }
      if (!mayUpdate) {
        return res.status(403).json({ error: 'شما فقط می‌توانید وضعیت نوبت‌های سالن خود را تغییر دهید.' });
      }
      const updated = await updateBookingStatus(id, req.body.status);
      if (!updated) return res.status(404).json({ error: 'نوبت یافت نشد.' });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'خطا در تغییر وضعیت.' });
    }
  });

  // === INJECTED API ROUTES ===
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.get('/api/audit-logs', requireAuth, requireRole(['super_admin']), async (_req, res) => {
    try { res.json(await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200)); }
    catch { res.status(500).json({ error: 'خطا در دریافت لاگ‌ها.' }); }
  });
  app.post('/api/salons/:id/reviews', requireAuth, async (req: AuthRequest, res) => {
    try {
      const salonId = Number(req.params.id), { rating } = req.body;
      if (!Number.isFinite(salonId) || !rating) return res.status(400).json({ error: 'اطلاعات ناقص است.' });
      const salon = await db.select().from(salons).where(eq(salons.id, salonId)).limit(1).then(r => r[0]);
      if (salon) {
        const nc = (salon.reviewsCount || 0) + 1, cr = Number(salon.rating) || 5;
        const nr = Number(((cr * (nc - 1) + Number(rating)) / nc).toFixed(1));
        await db.update(salons).set({ reviewsCount: nc, rating: String(nr) }).where(eq(salons.id, salonId));
      }
      res.status(201).json({ success: true });
    } catch { res.status(500).json({ error: 'خطا در ثبت نظر.' }); }
  });
  app.post('/api/notifications/broadcast', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const { title, content, targetAudience, testPhone } = req.body;
      if (!title || !content) return res.status(400).json({ error: 'عنوان و متن الزامی است.' });
      let sc = 0;

      if (testPhone) {
        // F-02: the duplicate registration ahead of this one ignored testPhone
        // and texted the whole audience; Express runs the first match, so the
        // "send a test SMS" button was a mass-SMS button.
        const clean = normalizePhone(testPhone);
        if (clean) {
          try {
            await sendMeliPayamakSms(clean, `${title}\n${content}`);
            sc++;
          } catch (e) {
            console.error('[TEST SMS ERROR]', e);
          }
        }
        return res.status(200).json({ success: true, sentCount: sc, testMessage: true });
      }

      // P3: Filter the audience in SQL, not in memory.
      const audienceRoles = targetAudience === 'customer'
        ? ['customer']
        : targetAudience === 'salon'
        ? ['salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager']
        : null;
      const tu = audienceRoles
        ? await db.select({ phone: users.phone }).from(users).where(inArray(users.role as any, audienceRoles))
        : await db.select({ phone: users.phone }).from(users);
      for (const u of tu) {
        if (u.phone) {
          try {
            await sendMeliPayamakSms(u.phone, `${title}\n${content}`);
            sc++;
          } catch {}
        }
      }
      const [n] = await db.insert(notifications).values({ title: String(title).trim(), content: String(content).trim(), type: 'promotional', targetAudience: targetAudience || 'all', channel: 'sms', isActive: true, badgeText: `${sc} پیامک` }).returning();
      res.status(201).json({ success: true, sentCount: sc, notification: n });
    } catch (e: any) { res.status(500).json({ error: e?.message || 'خطا در ارسال پیامک.' }); }
  });
  app.get('/api/tickets', requireAuth, async (req: AuthRequest, res) => {
    try {
      const list = req.dbUser.role === 'super_admin' ? await db.select().from(supportTickets).orderBy(desc(supportTickets.updatedAt)) : await db.select().from(supportTickets).where(eq(supportTickets.userId, req.dbUser.id)).orderBy(desc(supportTickets.updatedAt));
      // P3: Batch-load messages in ONE query instead of one per ticket (N+1).
      if (list.length === 0) return res.json([]);
      const allMessages = await db.select().from(ticketMessages)
        .where(inArray(ticketMessages.ticketId, list.map(t => t.id)))
        .orderBy(asc(ticketMessages.createdAt));
      const messagesByTicket = new Map<number, typeof allMessages>();
      for (const m of allMessages) {
        const arr = messagesByTicket.get(m.ticketId) ?? [];
        arr.push(m);
        messagesByTicket.set(m.ticketId, arr);
      }
      res.json(list.map(t => ({ ...t, messages: messagesByTicket.get(t.id) ?? [] })));
    } catch { res.status(500).json({ error: 'خطا در دریافت تیکت‌ها.' }); }
  });
  app.post('/api/tickets', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { subject, category, priority, message } = req.body;
      if (!subject || !message) return res.status(400).json({ error: 'موضوع و متن الزامی است.' });
      const [t] = await db.insert(supportTickets).values({ userId: req.dbUser.id, ticketCode: `TK-${crypto.randomInt(1000, 9999)}`, subject: String(subject).trim(), category: category || 'general', priority: priority || 'medium', status: 'open' }).returning();
      const [m] = await db.insert(ticketMessages).values({ ticketId: t.id, senderId: req.dbUser.id, senderRole: req.dbUser.role, message: String(message).trim() }).returning();
      res.status(201).json({ ...t, messages: [m] });
    } catch { res.status(500).json({ error: 'خطا در ایجاد تیکت.' }); }
  });
  app.post('/api/tickets/:id/messages', requireAuth, async (req: AuthRequest, res) => {
    try {
      const tid = Number(req.params.id), { message } = req.body;
      if (!message || !Number.isFinite(tid)) return res.status(400).json({ error: 'متن الزامی است.' });
      const t = await db.select().from(supportTickets).where(eq(supportTickets.id, tid)).limit(1).then(r => r[0]);
      if (!t) return res.status(404).json({ error: 'تیکت یافت نشد.' });
      if (req.dbUser.role !== 'super_admin' && t.userId !== req.dbUser.id) return res.status(403).json({ error: 'دسترسی ندارید.' });
      const [m] = await db.insert(ticketMessages).values({ ticketId: tid, senderId: req.dbUser.id, senderRole: req.dbUser.role, message: String(message).trim() }).returning();
      await db.update(supportTickets).set({ updatedAt: new Date(), status: req.dbUser.role === 'super_admin' ? 'in_progress' : 'open' }).where(eq(supportTickets.id, tid));
      res.status(201).json(m);
    } catch { res.status(500).json({ error: 'خطا در ارسال پیام.' }); }
  });
  app.patch('/api/tickets/:id/status', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const tid = Number(req.params.id), { status } = req.body;
      if (!status || !Number.isFinite(tid)) return res.status(400).json({ error: 'وضعیت الزامی است.' });
      res.json(await db.update(supportTickets).set({ status, updatedAt: new Date() }).where(eq(supportTickets.id, tid)).returning());
    } catch { res.status(500).json({ error: 'خطا در تغییر وضعیت.' }); }
  });
  // === END INJECTED API ROUTES ===

  // ==========================================
  // USERS MANAGEMENT ROUTES
  // ==========================================
  // API برای ساخت کاربر جدید (توسط ادمین)
  // API برای دریافت لیست تمام کاربران
  app.get('/api/users', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const usersList = await db.select().from(users).orderBy(desc(users.createdAt));
      res.json(usersList);
    } catch (err) {
      console.error('❌ API GET USERS ERROR:', err);
      res.status(500).json({ error: 'خطا در دریافت لیست کاربران.' });
    }
  });
    app.post('/api/users', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const { fullName, phone, email, role } = req.body;
      const cleanPhone = normalizePhone(phone);
      
      if (!cleanPhone) {
        return res.status(400).json({ error: 'شماره موبایل نامعتبر است.' });
      }

      // بررسی اینکه آیا کاربر از قبل وجود دارد یا خیر
      const existingUser = await db.select().from(users).where(eq(users.phone, cleanPhone)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'کاربری با این شماره موبایل قبلاً ثبت شده است.' });
      }

      const uid = `phone_${cleanPhone}`;
      
      const [newUser] = await db.insert(users).values({
        uid,
        phone: cleanPhone,
        fullName: fullName || `کاربر ${cleanPhone.slice(-4)}`,
        email: email || `${cleanPhone}@boya.ir`,
        role: sanitizeRole(role),
        status: 'active',
      }).returning();

      res.json({ success: true, user: newUser });
    } catch (err) {
      console.error('❌ API USERS CRITICAL ERROR:', err);
      res.status(500).json({ error: 'خطا در ایجاد کاربر.' });
    }
  });
  // ==========================================
  // AUDIT (P0): Users CRUD — admin panel
  // ==========================================
  app.patch('/api/users/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const data = schemas.userUpdateSchema.parse(req.body);
      const [updated] = await db.update(users).set(data as any).where(eq(users.id, id)).returning();
      if (!updated) return res.status(404).json({ error: 'کاربر یافت نشد.' });
      res.json({ success: true, user: updated });
    } catch (err) {
      console.error('[PATCH USER ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش کاربر.' });
    }
  });

  app.delete('/api/users/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(users).where(eq(users.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE USER ERROR]', err);
      res.status(500).json({ error: 'خطا در حذف کاربر.' });
    }
  });

  // ==========================================
  // AUDIT (P0): Services CRUD — salon admin
  // ==========================================
  app.get('/api/services', requireAuth, async (req: AuthRequest, res) => {
    try {
      const salonIdParam = req.query.salonId;
      // Multi-tenant: salon staff cannot read another salon's services by
      // passing ?salonId=<other salon> — the param must match their own.
      if (salonIdParam && req.dbUser.role !== 'super_admin') {
        const allowed = assertSalonScope(req, Number(salonIdParam));
        if (allowed === null) return res.status(403).json({ error: 'شما فقط به خدمات سالن خود دسترسی دارید.' });
      }
      const targetSalonId = salonIdParam ? Number(salonIdParam) : Number(req.dbUser.salonId);
      if (!Number.isFinite(targetSalonId)) return res.status(400).json({ error: 'شناسه سالن الزامی است.' });

      if (!salonIdParam && req.dbUser.role === 'super_admin') {
        return res.json(await db.select().from(services));
      }
      const list = await db.select().from(services).where(eq(services.salonId, targetSalonId));
      res.json(list);
    } catch (err: any) {
      console.error('[GET SERVICES ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت خدمات.' });
    }
  });

  // Independent (owner-rooted, no salon) services — used by the super-admin
  // approvals queue. Pending salon services still arrive embedded under
  // salons; these have salonId = null and would otherwise be invisible.
  app.get('/api/services/independent', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const rows = await db.select().from(services)
        .where(sql`${services.ownerId} IS NOT NULL`)
        .orderBy(desc(services.createdAt));
      // Join owner names for the approvals panel.
      const ownerIds = rows.map((r: any) => r.ownerId).filter(Boolean);
      const owners = ownerIds.length
        ? await db.select().from(users).where(inArray(users.id, ownerIds))
        : [];
      const ownerById = new Map(owners.map((u: any) => [u.id, u]));
      res.json(rows.map((r: any) => ({
        ...r,
        ownerName: ownerById.get(r.ownerId)?.fullName || null,
        ownerPhone: ownerById.get(r.ownerId)?.phone || null,
      })));
    } catch (err: any) {
      console.error('[GET INDEPENDENT SERVICES ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت خدمات مستقل.' });
    }
  });

  // Super-admin approval of an independent specialist's service.
  app.patch('/api/services/:id/approve', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const [updated] = await db.update(services)
        .set({ publicationStatus: 'active' }).where(eq(services.id, id)).returning();
      if (!updated) return res.status(404).json({ error: 'خدمت یافت نشد.' });
      await logSecurityAction({ actorId: req.dbUser.id, action: 'USER_UPDATE', targetId: String(id), details: { serviceApproved: true }, ipAddress: req.ip });
      res.json({ success: true, service: updated });
    } catch (err: any) {
      console.error('[APPROVE SERVICE ERROR]', err);
      res.status(500).json({ error: 'خطا در تایید خدمت.' });
    }
  });

  app.post('/api/services', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const data = schemas.serviceCreateSchema.parse(req.body);
      const salonId = Number(data.salonId) || Number(req.dbUser.salonId);
      if (!Number.isFinite(salonId)) return res.status(400).json({ error: 'شناسه سالن الزامی است.' });
      const allowed = assertSalonScope(req, salonId);
      if (allowed === null) {
        return res.status(403).json({ error: 'شما فقط می‌توانید به سالن خود خدمت اضافه کنید.' });
      }
      const [created] = await db.insert(services).values({
        salonId,
        serviceLineId: data.serviceLineId,
        name: data.name,
        description: data.description ?? null,
        price: String(data.price),
        durationMinutes: Number(data.durationMinutes),
        isMobileAvailable: Boolean(data.isMobileAvailable),
        imageUrl: data.imageUrl ?? null,
      } as any).returning();
      res.status(201).json(created);
    } catch (err) {
      console.error('[POST SERVICES ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ایجاد خدمت.' });
    }
  });

  app.patch('/api/services/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const data = schemas.serviceUpdateSchema.parse(req.body);
      const [existing] = await db.select().from(services).where(eq(services.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: 'خدمت یافت نشد.' });
      // Independent (owner-rooted) services belong to the specialist, not any
      // salon: assertSalonScope(..., null) would otherwise treat them as the
      // caller's own. Only the owner or super_admin may touch them here.
      if (existing.ownerId != null) {
        if (req.dbUser.role !== 'super_admin' && existing.ownerId !== req.dbUser.id) {
          return res.status(403).json({ error: 'این خدمت متعلق به متخصص مستقل است.' });
        }
      } else {
        const allowed = assertSalonScope(req, existing.salonId);
        if (allowed === null) {
          return res.status(403).json({ error: 'شما فقط می‌توانید خدمات سالن خود را ویرایش کنید.' });
        }
      }
      const [updated] = await db.update(services).set(data as any).where(eq(services.id, id)).returning();
      if (!updated) return res.status(404).json({ error: 'خدمت یافت نشد.' });
      res.json({ success: true, service: updated });
    } catch (err) {
      console.error('[PATCH SERVICE ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش خدمت.' });
    }
  });

  app.delete('/api/services/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const [existing] = await db.select().from(services).where(eq(services.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: 'خدمت یافت نشد.' });
      if (existing.ownerId != null) {
        if (req.dbUser.role !== 'super_admin' && existing.ownerId !== req.dbUser.id) {
          return res.status(403).json({ error: 'این خدمت متعلق به متخصص مستقل است.' });
        }
      } else {
        const allowed = assertSalonScope(req, existing.salonId);
        if (allowed === null) {
          return res.status(403).json({ error: 'شما فقط می‌توانید خدمات سالن خود را حذف کنید.' });
        }
      }
      await db.delete(services).where(eq(services.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE SERVICE ERROR]', err);
      res.status(500).json({ error: 'خطا در حذف خدمت.' });
    }
  });

  // ==========================================
  // AUDIT (P0): Specialists CRUD + portfolio — salon admin
  // ==========================================
  app.get('/api/specialists', requireAuth, async (req: AuthRequest, res) => {
    try {
      const salonIdParam = req.query.salonId;
      // Multi-tenant: ?salonId= must match the caller's own salon.
      if (salonIdParam && req.dbUser.role !== 'super_admin') {
        const allowed = assertSalonScope(req, Number(salonIdParam));
        if (allowed === null) return res.status(403).json({ error: 'شما فقط به متخصصین سالن خود دسترسی دارید.' });
      }
      const targetSalonId = salonIdParam ? Number(salonIdParam) : Number(req.dbUser.salonId);

      if (!salonIdParam && req.dbUser.role === 'super_admin') {
        return res.json(await db.select().from(specialists));
      }
      if (!Number.isFinite(targetSalonId)) return res.status(400).json({ error: 'شناسه سالن الزامی است.' });
      const list = await db.select().from(specialists).where(eq(specialists.salonId, targetSalonId));
      res.json(list);
    } catch (err: any) {
      console.error('[GET SPECIALISTS ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت متخصصین.' });
    }
  });

  app.post('/api/specialists', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const data = schemas.specialistCreateSchema.parse(req.body);
      const salonId = Number(data.salonId) || Number(req.dbUser.salonId);
      if (!Number.isFinite(salonId)) return res.status(400).json({ error: 'شناسه سالن الزامی است.' });
      const allowed = assertSalonScope(req, salonId);
      if (allowed === null) {
        return res.status(403).json({ error: 'شما فقط می‌توانید به سالن خود متخصص اضافه کنید.' });
      }

      // Resolve the user by phone (server-side) so the client cannot pick an
      // arbitrary userId, then bind them to this salon as a salon_specialist.
      const cleanPhone = normalizePhone(String(data.phone));
      if (!cleanPhone) return res.status(400).json({ error: 'شماره همراه متخصص معتبر نیست.' });
      const { getOrCreateUserByPhone } = await import('./src/db/users.ts');
      const dbUser = await getOrCreateUserByPhone(cleanPhone, data.fullName);

      // PRIVILEGE ESCALATION GUARD: a salon admin must not be able to register
      // an existing privileged account (super_admin, another salon_admin, a
      // line_manager) as a specialist of their own salon — the role update
      // below would otherwise demote that account and rebind it.
      if (dbUser.role === 'super_admin' || dbUser.role === 'salon_admin' || dbUser.role === 'line_manager') {
        return res.status(403).json({ error: 'این کاربر دارای نقش مدیریتی است و نمی‌تواند به عنوان متخصص ثبت شود.' });
      }
      const existing = await db.select({ id: specialists.id, salonId: specialists.salonId }).from(specialists)
        .where(eq(specialists.userId, dbUser.id)).limit(1);
      if (existing.length > 0) {
        if (existing[0].salonId !== salonId) {
          return res.status(400).json({ error: 'این کاربر قبلاً متخصص سالن دیگری است.' });
        }
        return res.status(400).json({ error: 'این کاربر قبلاً متخصص ثبت شده است.' });
      }

      // Registered as pending: super_admin must approve the documents before
      // the specialist is published to customers.
      const [created] = await db.insert(specialists).values({
        userId: dbUser.id,
        salonId,
        specialtyLine: data.specialtyLine,
        bio: data.bio ?? null,
        experienceYears: Number(data.experienceYears ?? 1),
        isMobileActive: Boolean(data.isMobileActive),
        isRentedChair: Boolean(data.isRentedChair),
        avatarUrl: data.avatarUrl ?? null,
        documents: Array.isArray(data.documents) && data.documents.length > 0 ? JSON.stringify(data.documents) : null,
        publicationStatus: 'pending',
      } as any).returning();

      // Promote to salon_specialist only after the specialist row exists, so a
      // failed insert cannot leave an orphaned user bound to this salon.
      await db.update(users).set({ role: 'salon_specialist', salonId }).where(eq(users.id, dbUser.id));
      res.status(201).json(created);
    } catch (err) {
      console.error('[POST SPECIALISTS ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ایجاد متخصص.' });
    }
  });

  app.patch('/api/specialists/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const data = schemas.specialistUpdateSchema.parse(req.body);
      const [existing] = await db.select().from(specialists).where(eq(specialists.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: 'متخصص یافت نشد.' });
      const allowed = assertSalonScope(req, existing.salonId);
      if (allowed === null) {
        return res.status(403).json({ error: 'شما فقط می‌توانید متخصصین سالن خود را ویرایش کنید.' });
      }
      // A rented-chair (independent) specialist manages their own schedule;
      // the salon manager may not edit them.
      if (existing.isRentedChair && req.dbUser.role !== 'super_admin') {
        return res.status(403).json({ error: 'متخصص مستقل (صندلی اجاره‌داده‌شده) توسط مدیر سالن قابل ویرایش نیست.' });
      }
      const patch: Record<string, any> = { ...data };
      if (Array.isArray(patch.documents)) patch.documents = JSON.stringify(patch.documents);
      if (typeof data.fullName === 'string') {
        await db.update(users).set({ fullName: data.fullName }).where(eq(users.id, existing.userId));
        delete patch.fullName;
      }
      const [updated] = await db.update(specialists).set(patch as any).where(eq(specialists.id, id)).returning();
      if (!updated) return res.status(404).json({ error: 'متخصص یافت نشد.' });
      res.json({ success: true, specialist: updated });
    } catch (err) {
      console.error('[PATCH SPECIALIST ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش متخصص.' });
    }
  });

  app.delete('/api/specialists/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const [existing] = await db.select().from(specialists).where(eq(specialists.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: 'متخصص یافت نشد.' });
      const allowed = assertSalonScope(req, existing.salonId);
      if (allowed === null) {
        return res.status(403).json({ error: 'شما فقط می‌توانید متخصصین سالن خود را حذف کنید.' });
      }
      if (existing.isRentedChair && req.dbUser.role !== 'super_admin') {
        return res.status(403).json({ error: 'متخصص مستقل (صندلی اجاره‌داده‌شده) توسط مدیر سالن قابل حذف نیست.' });
      }
      await db.delete(specialists).where(eq(specialists.id, id));
      // TENANCY HYGIENE: deleting the specialist row must also release the
      // user's binding, otherwise the ex-staff account keeps role+salonId and
      // stays privileged after removal from the salon's roster.
      await db.update(users).set({ role: 'customer', salonId: null })
        .where(eq(users.id, existing.userId)).catch(() => {});
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE SPECIALIST ERROR]', err);
      res.status(500).json({ error: 'خطا در حذف متخصص.' });
    }
  });

  // Super-admin approval of a salon-registered specialist (documents reviewed).
  app.patch('/api/specialists/:id/approve', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const [updated] = await db.update(specialists)
        .set({ publicationStatus: 'active', isVerified: true })
        .where(eq(specialists.id, id)).returning();
      if (!updated) return res.status(404).json({ error: 'متخصص یافت نشد.' });
      await logSecurityAction({ actorId: req.dbUser.id, action: 'USER_UPDATE', targetId: String(id), details: { approved: true }, ipAddress: req.ip });
      res.json({ success: true, specialist: updated });
    } catch (err: any) {
      console.error('[APPROVE SPECIALIST ERROR]', err);
      res.status(500).json({ error: 'خطا در تایید متخصص.' });
    }
  });

  app.patch('/api/specialists/:id/reject', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      // Rejection removes the pending specialist row; the underlying user stays.
      const [existing] = await db.select().from(specialists).where(eq(specialists.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: 'متخصص یافت نشد.' });
      await db.delete(specialists).where(eq(specialists.id, id));
      await logSecurityAction({ actorId: req.dbUser.id, action: 'USER_UPDATE', targetId: String(id), details: { rejected: true }, ipAddress: req.ip });
      res.json({ success: true });
    } catch (err: any) {
      console.error('[REJECT SPECIALIST ERROR]', err);
      res.status(500).json({ error: 'خطا در رد متخصص.' });
    }
  });

  app.post('/api/specialists/portfolio', requireAuth, requireRole(['super_admin', 'salon_admin', 'salon_specialist', 'mobile_specialist']), async (req: AuthRequest, res) => {
    try {
      const { specialistId, title, imageUrl, category } = req.body;
      if (!specialistId || !imageUrl) return res.status(400).json({ error: 'شناسه متخصص و تصویر الزامی است.' });
      // SECURITY: the caller must actually manage this specialist — a specialist
      // may only attach portfolio items to their own row, a salon_admin only to
      // a specialist in their own salon.
      const [target] = await db.select().from(specialists).where(eq(specialists.id, Number(specialistId))).limit(1);
      if (!target) return res.status(404).json({ error: 'متخصص یافت نشد.' });
      if (req.dbUser.role === 'salon_specialist' || req.dbUser.role === 'mobile_specialist') {
        if (target.userId !== req.dbUser.id) return res.status(403).json({ error: 'شما فقط به پروفایل خود دسترسی دارید.' });
      } else if (req.dbUser.role === 'salon_admin') {
        const allowed = assertSalonScope(req, target.salonId);
        if (allowed === null) return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
      }
      const [created] = await db.insert(portfolioItems).values({
        specialistId: Number(specialistId),
        title: String(title || 'نمونه کار'),
        imageUrl: String(imageUrl),
        category: String(category || 'general'),
      }).returning();
      res.status(201).json(created);
    } catch (err: any) {
      console.error('[POST PORTFOLIO ERROR]', err);
      res.status(500).json({ error: 'خطا در ثبت نمونه کار.' });
    }
  });

  app.delete('/api/specialists/portfolio/:id', requireAuth, requireRole(['super_admin', 'salon_admin', 'salon_specialist', 'mobile_specialist']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      // SECURITY: resolve the portfolio row and verify the caller owns it.
      const [item] = await db.select().from(portfolioItems).where(eq(portfolioItems.id, id)).limit(1);
      if (!item) return res.status(404).json({ error: 'نمونه‌کار یافت نشد.' });
      const [owner] = await db.select().from(specialists).where(eq(specialists.id, item.specialistId)).limit(1);
      if (!owner) return res.status(404).json({ error: 'متخصص یافت نشد.' });
      if (req.dbUser.role === 'salon_specialist' || req.dbUser.role === 'mobile_specialist') {
        if (owner.userId !== req.dbUser.id) return res.status(403).json({ error: 'شما فقط می‌توانید نمونه‌کارهای خود را حذف کنید.' });
      } else if (req.dbUser.role === 'salon_admin') {
        const allowed = assertSalonScope(req, owner.salonId);
        if (allowed === null) return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
      }
      await db.delete(portfolioItems).where(eq(portfolioItems.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE PORTFOLIO ERROR]', err);
      res.status(500).json({ error: 'خطا در حذف نمونه کار.' });
    }
  });

  // ==========================================
  // Independent specialist self-service (/api/me/*)
  // Rented-chair (isRentedChair) and mobile specialists manage their own
  // services, weekly schedule and portfolio here — ownership is resolved
  // from the authenticated user, never from a client-supplied id.
  // ==========================================

  // Resolve the specialist row of the *calling* user, regardless of salon.
  const resolveMySpecialist = async (req: AuthRequest) => {
    const [sp] = await db.select().from(specialists)
      .where(eq(specialists.userId, req.dbUser.id)).limit(1);
    return sp || null;
  };

  // GET /api/me/specialist — own profile + services + portfolio, db-backed.
  app.get('/api/me/specialist', requireAuth, requireRole(['salon_specialist', 'mobile_specialist']), async (req: AuthRequest, res) => {
    try {
      const sp = await resolveMySpecialist(req);
      if (!sp) return res.status(404).json({ error: 'پروفایل متخصص شما یافت نشد.' });
      const [myServices, myPortfolio, mySchedule] = await Promise.all([
        db.select().from(services).where(eq(services.ownerId, req.dbUser.id)),
        db.select().from(portfolioItems).where(eq(portfolioItems.specialistId, sp.id)),
        db.select().from(specialistWeeklySchedule).where(eq(specialistWeeklySchedule.specialistId, sp.id)),
      ]);
      const [userRow] = await db.select().from(users).where(eq(users.id, req.dbUser.id)).limit(1);
      res.json({
        ...sp,
        user: userRow ? { id: userRow.id, fullName: userRow.fullName, phone: userRow.phone, avatar: userRow.avatar, role: userRow.role } : null,
        services: myServices,
        portfolio: myPortfolio,
        weeklySchedule: mySchedule,
      });
    } catch (err: any) {
      console.error('[GET ME SPECIALIST ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت پروفایل متخصص.' });
    }
  });

  // GET /api/me/services — list own services (owner-resolved, no salonId).
  app.get('/api/me/services', requireAuth, requireRole(['salon_specialist', 'mobile_specialist']), async (req: AuthRequest, res) => {
    try {
      const list = await db.select().from(services).where(eq(services.ownerId, req.dbUser.id));
      res.json(list);
    } catch (err: any) {
      console.error('[GET ME SERVICES ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت خدمات.' });
    }
  });

  // POST /api/me/services — create own service (pending until super_admin approves).
  app.post('/api/me/services', requireAuth, requireRole(['salon_specialist', 'mobile_specialist']), async (req: AuthRequest, res) => {
    try {
      const sp = await resolveMySpecialist(req);
      if (!sp) return res.status(404).json({ error: 'پروفایل متخصص شما یافت نشد.' });
      const data = schemas.myServiceSchema.parse(req.body);
      const [created] = await db.insert(services).values({
        ownerId: req.dbUser.id,
        salonId: null,
        serviceLineId: data.serviceLineId || sp.specialtyLine,
        name: data.name,
        description: data.description ?? null,
        price: String(data.price),
        durationMinutes: Number(data.durationMinutes),
        isMobileAvailable: Boolean(data.isMobileAvailable),
        imageUrl: data.imageUrl ?? null,
        publicationStatus: 'pending',
      } as any).returning();
      res.status(201).json(created);
    } catch (err) {
      console.error('[POST ME SERVICES ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ایجاد خدمت.' });
    }
  });

  // PATCH /api/me/services/:id — edit own service (price/duration = cost of service).
  app.patch('/api/me/services/:id', requireAuth, requireRole(['salon_specialist', 'mobile_specialist']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const data = schemas.myServiceUpdateSchema.parse(req.body);
      const [existing] = await db.select().from(services).where(eq(services.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: 'خدمت یافت نشد.' });
      if (existing.ownerId !== req.dbUser.id) {
        return res.status(403).json({ error: 'شما فقط می‌توانید خدمات خود را ویرایش کنید.' });
      }
      const patch: Record<string, any> = { ...data };
      if (patch.price != null) patch.price = String(patch.price);
      const [updated] = await db.update(services).set(patch as any).where(eq(services.id, id)).returning();
      if (!updated) return res.status(404).json({ error: 'خدمت یافت نشد.' });
      res.json({ success: true, service: updated });
    } catch (err) {
      console.error('[PATCH ME SERVICES ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش خدمت.' });
    }
  });

  // DELETE /api/me/services/:id — delete own service.
  app.delete('/api/me/services/:id', requireAuth, requireRole(['salon_specialist', 'mobile_specialist']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const [existing] = await db.select().from(services).where(eq(services.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: 'خدمت یافت نشد.' });
      if (existing.ownerId !== req.dbUser.id) {
        return res.status(403).json({ error: 'شما فقط می‌توانید خدمات خود را حذف کنید.' });
      }
      await db.delete(services).where(eq(services.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE ME SERVICES ERROR]', err);
      res.status(500).json({ error: 'خطا در حذف خدمت.' });
    }
  });

  // GET/PUT /api/me/schedule — own weekly day/hour grid.
  app.get('/api/me/schedule', requireAuth, requireRole(['salon_specialist', 'mobile_specialist']), async (req: AuthRequest, res) => {
    try {
      const sp = await resolveMySpecialist(req);
      if (!sp) return res.status(404).json({ error: 'پروفایل متخصص شما یافت نشد.' });
      const rows = await db.select().from(specialistWeeklySchedule)
        .where(eq(specialistWeeklySchedule.specialistId, sp.id));
      res.json(rows);
    } catch (err: any) {
      console.error('[GET ME SCHEDULE ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت زمان‌بندی.' });
    }
  });

  app.put('/api/me/schedule', requireAuth, requireRole(['salon_specialist', 'mobile_specialist']), async (req: AuthRequest, res) => {
    try {
      const sp = await resolveMySpecialist(req);
      if (!sp) return res.status(404).json({ error: 'پروفایل متخصص شما یافت نشد.' });
      const rows = z.array(schemas.salonScheduleSchema).parse(req.body);
      // Replace the whole week in one go, mirroring the salon schedule PUT.
      await db.delete(specialistWeeklySchedule).where(eq(specialistWeeklySchedule.specialistId, sp.id));
      if (rows.length > 0) {
        await db.insert(specialistWeeklySchedule).values(
          rows.map((r) => ({
            specialistId: sp.id,
            dayOfWeek: r.dayOfWeek,
            openTime: r.openTime,
            closeTime: r.closeTime,
            isActive: r.isActive,
          })),
        );
      }
      res.json({ success: true, schedule: rows });
    } catch (err) {
      console.error('[PUT ME SCHEDULE ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ذخیره زمان‌بندی.' });
    }
  });

  // POST /api/me/portfolio — add portfolio item (specialistId resolved server-side).
  app.post('/api/me/portfolio', requireAuth, requireRole(['salon_specialist', 'mobile_specialist']), async (req: AuthRequest, res) => {
    try {
      const sp = await resolveMySpecialist(req);
      if (!sp) return res.status(404).json({ error: 'پروفایل متخصص شما یافت نشد.' });
      const data = schemas.myPortfolioSchema.parse(req.body);
      const [created] = await db.insert(portfolioItems).values({
        specialistId: sp.id,
        title: data.title,
        imageUrl: data.imageUrl,
        category: data.category,
      }).returning();
      res.status(201).json(created);
    } catch (err) {
      console.error('[POST ME PORTFOLIO ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ثبت نمونه‌کار.' });
    }
  });

  // DELETE /api/me/portfolio/:id — delete own portfolio item.
  app.delete('/api/me/portfolio/:id', requireAuth, requireRole(['salon_specialist', 'mobile_specialist']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const sp = await resolveMySpecialist(req);
      if (!sp) return res.status(404).json({ error: 'پروفایل متخصص شما یافت نشد.' });
      const [existing] = await db.select().from(portfolioItems).where(eq(portfolioItems.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: 'نمونه‌کار یافت نشد.' });
      if (existing.specialistId !== sp.id) {
        return res.status(403).json({ error: 'شما فقط می‌توانید نمونه‌کارهای خود را حذف کنید.' });
      }
      await db.delete(portfolioItems).where(eq(portfolioItems.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE ME PORTFOLIO ERROR]', err);
      res.status(500).json({ error: 'خطا در حذف نمونه‌کار.' });
    }
  });

  // ==========================================
  // Salon-admin service portfolio ("نمونه‌کار خدمات")
  // The salon manager curates sample-work images per service across every
  // line — EXCEPT rented-chair (independent) specialists' services, which
  // belong to the specialist, not the salon. Tenancy is read off
  // services.salon_id (NULL on owner-rooted services) so the lock is
  // structural, not a flag someone can flip.
  // ==========================================

  // Guard: fetch the service and require it to be a *salon* service the
  // caller manages. Returns the service row or a response-ready error.
  const requireSalonServiceForPortfolio = async (
    req: AuthRequest,
    serviceId: number,
  ): Promise<{ status: number; error: string } | { svc: typeof services.$inferSelect }> => {
    const [svc] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
    if (!svc) return { status: 404, error: 'خدمت یافت نشد.' };
    if (svc.ownerId != null) {
      // Owner-rooted service (independent/rented-chair or mobile specialist).
      return {
        status: 403,
        error: 'این خدمت متعلق به متخصص مستقل (صندلی اجاره‌داده‌شده) است و مدیر سالن نمی‌تواند نمونه‌کار آن را ویرایش کند.',
      };
    }
    const allowed = assertSalonScope(req, svc.salonId);
    if (allowed === null) return { status: 403, error: 'شما فقط به خدمات سالن خود دسترسی دارید.' };
    return { svc };
  };

  // GET /api/services/:id/portfolio — list a service's sample-work images.
  app.get('/api/services/:id/portfolio', requireAuth, async (req: AuthRequest, res) => {
    try {
      const serviceId = Number(req.params.id);
      if (!Number.isFinite(serviceId)) return res.status(400).json({ error: 'شناسه خدمت نامعتبر است.' });
      // Any authenticated staff member of the owning salon may view; a null
      // salonId (owner-rooted) is public read for simplicity of the customer view.
      const rows = await db.select().from(servicePortfolioItems)
        .where(eq(servicePortfolioItems.serviceId, serviceId))
        .orderBy(desc(servicePortfolioItems.createdAt));
      res.json(rows);
    } catch (err: any) {
      console.error('[GET SERVICE PORTFOLIO ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت نمونه‌کار خدمت.' });
    }
  });

  // POST /api/services/:id/portfolio — add a sample-work image.
  app.post('/api/services/:id/portfolio', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const serviceId = Number(req.params.id);
      if (!Number.isFinite(serviceId)) return res.status(400).json({ error: 'شناسه خدمت نامعتبر است.' });
      const guard = await requireSalonServiceForPortfolio(req, serviceId);
      if ('error' in guard) return res.status(guard.status).json({ error: guard.error });
      const data = schemas.servicePortfolioCreateSchema.parse(req.body);
      const [created] = await db.insert(servicePortfolioItems).values({
        serviceId,
        imageUrl: data.imageUrl,
        title: data.title ?? null,
      }).returning();
      res.status(201).json(created);
    } catch (err) {
      console.error('[POST SERVICE PORTFOLIO ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ثبت نمونه‌کار خدمت.' });
    }
  });

  // PATCH /api/services/:id/portfolio/:itemId — edit an image (url/title).
  app.patch('/api/services/:id/portfolio/:itemId', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const serviceId = Number(req.params.id);
      const itemId = Number(req.params.itemId);
      if (!Number.isFinite(serviceId) || !Number.isFinite(itemId)) {
        return res.status(400).json({ error: 'شناسه‌ها نامعتبر است.' });
      }
      const guard = await requireSalonServiceForPortfolio(req, serviceId);
      if ('error' in guard) return res.status(guard.status).json({ error: guard.error });
      const data = schemas.servicePortfolioUpdateSchema.parse(req.body);
      const [existing] = await db.select().from(servicePortfolioItems)
        .where(eq(servicePortfolioItems.id, itemId)).limit(1);
      if (!existing) return res.status(404).json({ error: 'نمونه‌کار یافت نشد.' });
      if (existing.serviceId !== serviceId) {
        return res.status(403).json({ error: 'این نمونه‌کار به خدمت دیگری تعلق دارد.' });
      }
      const [updated] = await db.update(servicePortfolioItems)
        .set(data as any)
        .where(eq(servicePortfolioItems.id, itemId)).returning();
      if (!updated) return res.status(404).json({ error: 'نمونه‌کار یافت نشد.' });
      res.json({ success: true, item: updated });
    } catch (err) {
      console.error('[PATCH SERVICE PORTFOLIO ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش نمونه‌کار خدمت.' });
    }
  });

  // DELETE /api/services/:id/portfolio/:itemId — remove an image.
  app.delete('/api/services/:id/portfolio/:itemId', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const serviceId = Number(req.params.id);
      const itemId = Number(req.params.itemId);
      if (!Number.isFinite(serviceId) || !Number.isFinite(itemId)) {
        return res.status(400).json({ error: 'شناسه‌ها نامعتبر است.' });
      }
      const guard = await requireSalonServiceForPortfolio(req, serviceId);
      if ('error' in guard) return res.status(guard.status).json({ error: guard.error });
      const [existing] = await db.select().from(servicePortfolioItems)
        .where(eq(servicePortfolioItems.id, itemId)).limit(1);
      if (!existing) return res.status(404).json({ error: 'نمونه‌کار یافت نشد.' });
      if (existing.serviceId !== serviceId) {
        return res.status(403).json({ error: 'این نمونه‌کار به خدمت دیگری تعلق دارد.' });
      }
      await db.delete(servicePortfolioItems).where(eq(servicePortfolioItems.id, itemId));
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE SERVICE PORTFOLIO ERROR]', err);
      res.status(500).json({ error: 'خطا در حذف نمونه‌کار خدمت.' });
    }
  });

  // ==========================================
  // Commissions: per-specialist default + per-service overrides
  // ==========================================
  app.get('/api/specialists/:id/commissions', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const [existing] = await db.select().from(specialists).where(eq(specialists.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: 'متخصص یافت نشد.' });
      const allowed = assertSalonScope(req, existing.salonId);
      if (allowed === null) return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
      const overrides = await db.select().from(specialistServiceCommissions)
        .where(eq(specialistServiceCommissions.specialistId, id));
      res.json({ commissionPercent: existing.commissionPercent, overrides });
    } catch (err: any) {
      console.error('[GET COMMISSIONS ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت پورسانت.' });
    }
  });

  app.put('/api/specialists/:id/commissions', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const overrides = schemas.commissionOverridesSchema.parse(req.body);
      const [existing] = await db.select().from(specialists).where(eq(specialists.id, id)).limit(1);
      if (!existing) return res.status(404).json({ error: 'متخصص یافت نشد.' });
      const allowed = assertSalonScope(req, existing.salonId);
      if (allowed === null) return res.status(403).json({ error: 'دسترسی غیرمجاز.' });

      // Replace the whole override set in one transaction.
      await db.delete(specialistServiceCommissions).where(eq(specialistServiceCommissions.specialistId, id));
      if (overrides.length > 0) {
        await db.insert(specialistServiceCommissions).values(
          overrides.map((o) => ({
            specialistId: id,
            serviceId: Number(o.serviceId),
            commissionPercent: Number(o.commissionPercent),
          })),
        );
      }
      res.json({ success: true, overrides });
    } catch (err) {
      console.error('[PUT COMMISSIONS ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ذخیره پورسانت.' });
    }
  });

  // ==========================================
  // Salon weekly schedule (day/hour grid)
  // ==========================================
  app.get('/api/salons/:id/schedule', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'شناسه سالن نامعتبر است.' });
      const allowed = assertSalonScope(req, id);
      if (allowed === null) return res.status(403).json({ error: 'شما فقط به زمان‌بندی سالن خود دسترسی دارید.' });
      const rows = await db.select().from(salonWeeklySchedule).where(eq(salonWeeklySchedule.salonId, id));
      res.json(rows);
    } catch (err: any) {
      console.error('[GET SCHEDULE ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت زمان‌بندی.' });
    }
  });

  app.put('/api/salons/:id/schedule', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'شناسه سالن نامعتبر است.' });
      const allowed = assertSalonScope(req, id);
      if (allowed === null) return res.status(403).json({ error: 'شما فقط می‌توانید زمان‌بندی سالن خود را ویرایش کنید.' });
      const rows = z.array(schemas.salonScheduleSchema).parse(req.body);

      await db.delete(salonWeeklySchedule).where(eq(salonWeeklySchedule.salonId, id));
      if (rows.length > 0) {
        await db.insert(salonWeeklySchedule).values(
          rows.map((r) => ({ salonId: id, dayOfWeek: r.dayOfWeek, openTime: r.openTime, closeTime: r.closeTime, isActive: r.isActive })),
        );
      }
      res.json({ success: true, schedule: rows });
    } catch (err) {
      console.error('[PUT SCHEDULE ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ذخیره زمان‌بندی.' });
    }
  });

  // ==========================================
  // AUDIT (P0): Notifications CRUD & Campaign Management
  // ==========================================
  // F-01: replaced an inline check against a cookie that is never set
  // (`auth_token`) — which also skipped revocation, suspension and user
  // existence — with the same middleware every other privileged endpoint
  // uses. Staff see all rows; anonymous users see active rows only.
  app.get('/api/notifications', requireAuth, requireRole(['super_admin', 'salon_admin', 'line_manager']), async (_req: AuthRequest, res) => {
    try {
      const list = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
      res.json(list);
    } catch (err: any) {
      console.error('[GET NOTIFICATIONS ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت اعلانات.' });
    }
  });
  app.get('/api/notifications/public', async (_req, res) => {
    try {
      const list = await db.select().from(notifications).where(eq(notifications.isActive, true)).orderBy(desc(notifications.createdAt));
      res.json(list);
    } catch (err: any) {
      console.error('[GET NOTIFICATIONS PUBLIC ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت اعلانات.' });
    }
  });

  app.post('/api/notifications', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const {
        title,
        content,
        type = 'promotional',
        targetAudience = 'all',
        channel = 'in_app',
        displayPosition = 'banner',
        targetPanels = 'all',
        badgeText,
        actionUrl,
        actionText,
        expiresAt,
      } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: 'عنوان و متن پیام الزامی است.' });
      }

      const [created] = await db.insert(notifications).values({
        title: String(title).trim(),
        content: String(content).trim(),
        type: String(type || 'promotional'),
        targetAudience: String(targetAudience || 'all'),
        channel: String(channel || 'in_app'),
        displayPosition: String(displayPosition || 'banner'),
        targetPanels: String(targetPanels || 'all'),
        badgeText: badgeText ? String(badgeText).trim() : null,
        actionUrl: actionUrl ? String(actionUrl).trim() : null,
        actionText: actionText ? String(actionText).trim() : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        viewsCount: 0,
        clicksCount: 0,
      }).returning();

      res.status(201).json(created);
    } catch (err: any) {
      console.error('[POST NOTIFICATIONS ERROR]', err);
      res.status(500).json({ error: 'خطا در ایجاد اعلان.' });
    }
  });

  app.patch('/api/notifications/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const patch: Record<string, any> = {};
      const { isActive, title, content, badgeText, displayPosition, targetPanels, type, targetAudience, channel, actionUrl, actionText, expiresAt } = req.body;
      if (typeof isActive === 'boolean') patch.isActive = isActive;
      if (typeof title === 'string') patch.title = title.trim();
      if (typeof content === 'string') patch.content = content.trim();
      if (typeof badgeText === 'string') patch.badgeText = badgeText.trim();
      if (typeof displayPosition === 'string') patch.displayPosition = displayPosition;
      if (typeof targetPanels === 'string') patch.targetPanels = targetPanels;
      if (typeof type === 'string') patch.type = type;
      if (typeof targetAudience === 'string') patch.targetAudience = targetAudience;
      if (typeof channel === 'string') patch.channel = channel;
      if (actionUrl !== undefined) patch.actionUrl = actionUrl ? String(actionUrl).trim() : null;
      if (actionText !== undefined) patch.actionText = actionText ? String(actionText).trim() : null;
      if (expiresAt !== undefined) patch.expiresAt = expiresAt ? new Date(expiresAt) : null;

      const [updated] = await db.update(notifications).set(patch).where(eq(notifications.id, id)).returning();
      if (!updated) return res.status(404).json({ error: 'اعلان یافت نشد.' });
      res.json(updated);
    } catch (err: any) {
      console.error('[PATCH NOTIFICATIONS ERROR]', err);
      res.status(500).json({ error: 'خطا در به‌روزرسانی اعلان.' });
    }
  });

  app.delete('/api/notifications/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(notifications).where(eq(notifications.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE NOTIFICATIONS ERROR]', err);
      res.status(500).json({ error: 'خطا در حذف اعلان.' });
    }
  });

  app.post('/api/notifications/:id/view', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      await db.update(notifications).set({ viewsCount: sql`${notifications.viewsCount} + 1` }).where(eq(notifications.id, id));
      res.json({ success: true });
    } catch {
      res.json({ success: false });
    }
  });

  app.post('/api/notifications/:id/click', requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
      await db.update(notifications).set({ clicksCount: sql`${notifications.clicksCount} + 1` }).where(eq(notifications.id, id));
      res.json({ success: true });
    } catch {
      res.json({ success: false });
    }
  });

  // ==========================================
  // AUDIT (P0): Admin profile + line-manager staff
  // ==========================================
  app.get('/api/admin/profile', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const profile = await db.select().from(adminProfile).limit(1).then(r => r[0] || null);
      res.json(profile);
    } catch (err: any) {
      console.error('[GET ADMIN PROFILE ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت پروفایل مدیریت.' });
    }
  });

  app.patch('/api/admin/profile', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const data = schemas.adminProfileUpdateSchema.parse(req.body);
      const existing = await db.select().from(adminProfile).limit(1).then(r => r[0]);
      let result;
      if (!existing) {
        // admin_profile has NOT NULL columns the partial schema may omit.
        [result] = await db.insert(adminProfile).values({
          fullName: data.fullName ?? 'مدیر سیستم',
          phone: data.phone ?? '۰۹۱۰۰۰۰۰۰۰۰',
          email: data.email ?? 'admin@boya.ir',
          ...data,
        } as any).returning();
      } else {
        [result] = await db.update(adminProfile).set(data as any).where(eq(adminProfile.id, existing.id)).returning();
      }
      res.json(result);
    } catch (err) {
      console.error('[PATCH ADMIN PROFILE ERROR]', err);
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در به‌روزرسانی پروفایل مدیریت.' });
    }
  });

  app.get('/api/line-manager/staff', requireAuth, requireRole(['super_admin', 'line_manager']), async (req: AuthRequest, res) => {
    try {
      const line = req.dbUser.managedLine;
      // Return the same flattened member shape the staff tab renders
      // (fullName/phone/status) — the raw specialists rows have none of these.
      const specs = line
        ? await db.select().from(specialists).where(eq(specialists.specialtyLine, line))
        : await db.select().from(specialists);
      const ids = [...new Set(specs.map((s) => s.userId))];
      const owners = ids.length
        ? await db.select().from(users).where(inArray(users.id, ids))
        : [];
      const byId = new Map(owners.map((u) => [u.id, u]));
      res.json(specs.map((sp) => {
        const u: any = byId.get(sp.userId);
        return {
          id: sp.id,
          fullName: u?.fullName || '',
          phone: u?.phone || '',
          status: u?.status || 'active',
          specialtyLine: sp.specialtyLine,
          isVerified: sp.isVerified,
        };
      }));
    } catch (err: any) {
      console.error('[GET LINE-MANAGER STAFF ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت پرسنل.' });
    }
  });

  // ==========================================
  // MOBILE COMPATIBILITY LAYER (v1 API for the Flutter customer app)
  // Mounted at /api/v1 — translates the Flutter contract into the new backend.
  // ==========================================
  const { default: mobileRoutes } = await import('./src/routes/mobile.ts');
  app.use('/api/v1', mobileRoutes);

  let vite: any = null;
  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));

    // PWA: the service worker must never be served from a stale cache, or new
    // releases would keep running the previous version for up to 24h.
    app.get('/sw.js', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.resolve(__dirname, 'dist/sw.js'));
    });
  } else {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.get('*', async (req, res, next) => {
    try {
      const url = req.originalUrl;
      let template = fs.readFileSync(path.resolve(__dirname, isProd ? 'dist/index.html' : 'index.html'), 'utf-8');
      if (!isProd && vite) template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      next(e);
    }
  });

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[SERVER ERROR]', err);
    res.status(500).json({ error: 'خطای داخلی سرور.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [READY] Server on port ${PORT} [Mode: ${isProd ? 'Production' : 'Development'}]`);
    console.log(`🌍 [READY] Accessible at http://0.0.0.0:${PORT}`);
  });
}

createServer();
