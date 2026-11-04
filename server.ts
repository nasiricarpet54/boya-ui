import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { sanitizeRole } from './src/db/users.ts';
import Redis from 'ioredis';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { ZodError } from 'zod';

import { requireAuth, requireRole, type AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users, salons, services, bookings as bookingsTable, revokedTokens, notifications, adminProfile, specialists, portfolioItems, auditLogs, supportTickets, ticketMessages, refreshTokens } from './src/db/schema.ts';
import { eq, desc, and, inArray, asc, ne } from 'drizzle-orm';
import { createBooking, getBookingsForUser, updateBookingStatus } from './src/db/bookings.ts';
import { sendMeliPayamakSms } from './src/lib/meliPayamak.ts';
import { normalizeToIsoDate, normalizeTime, normalizeTimeToLatin, toLatinDigits, toIsoDate, gregorianToJalali, JALALI_MONTHS, STANDARD_HOURLY_SLOTS } from './src/shared/utils/dateIsoConverter.ts';
import { normalizePhone } from './src/shared/utils/persianUtils.ts';
import { generateJwtToken, generateRefreshTokenValue, decodeTokenExpiry, REFRESH_TOKEN_EXPIRES_IN_MS } from './src/lib/jwt.ts';
import { seedDatabase } from './src/db/seed.ts';
import { getOrCreateUserByPhone } from './src/db/users.ts';
import { runMigrations } from './src/db/migrate.ts';
import { logSecurityAction } from './src/db/audit.ts';
import * as schemas from './src/lib/validation.ts';
import { redactUserPII, processBookingData } from './src/lib/piiRedactor.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;

console.log(`[BOOT] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[BOOT] isProd: ${isProd}`);
console.log(`[BOOT] PORT: ${PORT}`);

// --- Redis & OTP Setup ---
const redisClient: Redis | null = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
if (redisClient) {
  redisClient.on('error', (e) => console.error('[REDIS ERROR]', e.message));
  console.log('[REDIS] Connected (durable OTP store).');
} else {
  console.warn('[REDIS] REDIS_URL not set -- using in-memory OTP.');
}

const memOtp = new Map<string, string>();
const memRate = new Map<string, string>();

async function otpSet(k: string, v: any, ttl: number) {
  if (redisClient) await redisClient.setex(`otp:${k}`, ttl, JSON.stringify(v));
  else memOtp.set(k, JSON.stringify(v));
}
async function otpGet(k: string) {
  if (redisClient) return JSON.parse(await redisClient.get(`otp:${k}`) || 'null');
  return JSON.parse(memOtp.get(k) || 'null');
}
async function otpDel(k: string) {
  if (redisClient) await redisClient.del(`otp:${k}`);
  else memOtp.delete(k);
}
async function rateIncr(k: string, ttl: number) {
  if (redisClient) return await redisClient.incr(`rate:${k}`);
  let c = (memRate.get(k) as any) || 0; c++; memRate.set(k, c); return c;
}

async function createServer() {
  const app = express();
  
  app.set('trust proxy', 1);

  if (isProd) {
    app.use(helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "img-src": ["'self'", "data:", "blob:", "https:", "https://images.unsplash.com"],
          "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          "connect-src": ["'self'", "https:*", "wss:*"]
        }
      },
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

  // AUDIT (P0): Upload persistence. Container filesystems are ephemeral, so
  // prefer UPLOADS_DIR (point it at a mounted volume), then /app/uploads,
  // then a local public/uploads for bare-metal/PM2 deploys.
  const envUploads = process.env.UPLOADS_DIR;
  const dockerUploads = '/app/uploads';
  const localUploads = path.resolve(process.cwd(), 'public/uploads');
  const uploadsDir = envUploads
    ? path.resolve(envUploads)
    : fs.existsSync(dockerUploads)
      ? dockerUploads
      : localUploads;
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(localUploads)) fs.mkdirSync(localUploads, { recursive: true });
  console.log(`[BOOT] Upload storage directory: ${uploadsDir}`);

  app.use('/uploads', express.static(uploadsDir));
  app.use('/uploads', express.static(localUploads));

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
      
      const attempts = await rateIncr(phone, 5 * 60);
      if (attempts > 3) return res.status(429).json({ error: 'تعداد درخواست بیش از حد مجاز. چند دقیقه صبر کنید.' });

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

      res.json(result);
    } catch (err) {
      console.error('❌ API SALONS CRITICAL ERROR:', err); res.status(500).json({ error: 'خطا در دریافت لیست.' });
    }
  });

  app.get('/api/managed/salons', requireAuth, requireRole(['super_admin', 'salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager']), async (req: AuthRequest, res) => {
    try {
      const salonId = req.dbUser.salonId;
      const rows = await db.query.salons.findMany({
        where: req.dbUser.role === 'super_admin' ? undefined : eq(salons.id, Number(salonId)),
        with: { services: true, specialists: { with: { user: true, portfolio: true } } },
      });
      res.json(rows);
    } catch (err) {
      console.error('❌ API SALONS CRITICAL ERROR:', err); res.status(500).json({ error: 'خطا در دریافت لیست.' });
    }
  });

  app.patch('/api/salons/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
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
  app.get('/api/salons/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'شناسه سالن نامعتبر است.' });
      const salon = await db.query.salons.findFirst({
        where: eq(salons.id, id),
        with: { services: true, specialists: { with: { user: true, portfolio: true } } },
      });
      if (!salon) return res.status(404).json({ error: 'سالن یافت نشد.' });
      res.json(salon);
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

      const booking = await createBooking({
        ...data,
        price: serviceRecord.price,
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
      const updated = await updateBookingStatus(id, req.body.status);
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
      const { title, content, targetAudience } = req.body;
      if (!title || !content) return res.status(400).json({ error: 'عنوان و متن الزامی است.' });
      // P3: Filter the audience in SQL, not in memory.
      const audienceRoles = targetAudience === 'customer'
        ? ['customer']
        : targetAudience === 'salon'
        ? ['salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager']
        : null;
      const tu = audienceRoles
        ? await db.select({ phone: users.phone }).from(users).where(inArray(users.role as any, audienceRoles))
        : await db.select({ phone: users.phone }).from(users);
      let sc = 0;
      for (const u of tu) if (u.phone) { try { await sendMeliPayamakSms(u.phone, `${title}\\n${content}`); sc++; } catch {} }
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

  app.post('/api/services', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const data = schemas.serviceCreateSchema.parse(req.body);
      const salonId = Number(data.salonId) || Number(req.dbUser.salonId);
      if (!Number.isFinite(salonId)) return res.status(400).json({ error: 'شناسه سالن الزامی است.' });
      if (req.dbUser.role === 'salon_admin' && Number(req.dbUser.salonId) !== salonId) {
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
      if (req.dbUser.role === 'salon_admin' && Number(req.dbUser.salonId) !== salonId) {
        return res.status(403).json({ error: 'شما فقط می‌توانید به سالن خود متخصص اضافه کنید.' });
      }
      const [created] = await db.insert(specialists).values({
        userId: Number(data.userId),
        salonId,
        specialtyLine: data.specialtyLine,
        bio: data.bio ?? null,
        experienceYears: Number(data.experienceYears ?? 1),
        isMobileActive: Boolean(data.isMobileActive),
        avatarUrl: data.avatarUrl ?? null,
      } as any).returning();
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
      const [updated] = await db.update(specialists).set(data as any).where(eq(specialists.id, id)).returning();
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
      await db.delete(specialists).where(eq(specialists.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE SPECIALIST ERROR]', err);
      res.status(500).json({ error: 'خطا در حذف متخصص.' });
    }
  });

  app.post('/api/specialists/portfolio', requireAuth, requireRole(['super_admin', 'salon_admin', 'salon_specialist']), async (req: AuthRequest, res) => {
    try {
      const { specialistId, title, imageUrl, category } = req.body;
      if (!specialistId || !imageUrl) return res.status(400).json({ error: 'شناسه متخصص و تصویر الزامی است.' });
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

  app.delete('/api/specialists/portfolio/:id', requireAuth, requireRole(['super_admin', 'salon_admin', 'salon_specialist']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(portfolioItems).where(eq(portfolioItems.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.error('[DELETE PORTFOLIO ERROR]', err);
      res.status(500).json({ error: 'خطا در حذف نمونه کار.' });
    }
  });

  // ==========================================
  // AUDIT (P0): Notifications read/update/delete — admin panel
  // ==========================================
  app.get('/api/notifications', requireAuth, async (req: AuthRequest, res) => {
    try {
      const isStaff = ['super_admin', 'salon_admin', 'line_manager'].includes(req.dbUser.role);
      const list = isStaff
        ? await db.select().from(notifications).orderBy(desc(notifications.createdAt))
        : await db.select().from(notifications).where(eq(notifications.isActive, true)).orderBy(desc(notifications.createdAt));
      res.json(list);
    } catch (err: any) {
      console.error('[GET NOTIFICATIONS ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت اعلانات.' });
    }
  });

  app.patch('/api/notifications/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const patch: Record<string, any> = {};
      const { isActive, title, content, badgeText } = req.body;
      if (typeof isActive === 'boolean') patch.isActive = isActive;
      if (typeof title === 'string') patch.title = title.trim();
      if (typeof content === 'string') patch.content = content.trim();
      if (typeof badgeText === 'string') patch.badgeText = badgeText.trim();

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
      const list = line
        ? await db.select().from(specialists).where(eq(specialists.specialtyLine, line))
        : await db.select().from(specialists);
      res.json(list);
    } catch (err: any) {
      console.error('[GET LINE-MANAGER STAFF ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت پرسنل.' });
    }
  });
  let vite: any = null;
  if (isProd) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
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
