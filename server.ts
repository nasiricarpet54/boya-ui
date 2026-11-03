import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
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
import {
  users,
  salons,
  services,
  bookings as bookingsTable,
  revokedTokens,
  notifications,
  adminProfile,
  specialists,
  portfolioItems,
  auditLogs,
  supportTickets,
  ticketMessages,
} from './src/db/schema.ts';
import { eq, desc, and, sql } from 'drizzle-orm';
import { createBooking, getBookingsForUser, updateBookingStatus } from './src/db/bookings.ts';
import { sendMeliPayamakSms } from './src/lib/meliPayamak.ts';
import { normalizeToIsoDate, normalizeTime } from './src/shared/utils/dateIsoConverter.ts';
import { normalizePhone } from './src/shared/utils/persianUtils.ts';
import { generateJwtToken } from './src/lib/jwt.ts';
import { seedDatabase } from './src/db/seed.ts';
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

// --- Strict Fail-Fast Production Environment Checks ---
if (isProd && !process.env.REDIS_URL) {
  console.error('🚨 [CRITICAL SECURITY ERROR] REDIS_URL environment variable is required in production! Fail-fast termination.');
  process.exit(1);
}

// --- Redis & OTP Setup (Redis Only, No In-Memory Fallbacks) ---
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 2,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 100, 2000);
  },
});

redis.on('error', (err) => {
  console.error('[REDIS ERROR]', err.message);
});

redis.on('connect', () => {
  console.log('[REDIS] Connected successfully to Redis instance.');
});

const OTP_TTL_SECONDS = 300; // 5 minutes TTL

async function otpSet(phone: string, data: { code: string; attempts: number }): Promise<void> {
  await redis.setex(`otp:${phone}`, OTP_TTL_SECONDS, JSON.stringify(data));
}

async function otpGet(phone: string): Promise<{ code: string; attempts: number } | null> {
  const raw = await redis.get(`otp:${phone}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function otpDel(phone: string): Promise<void> {
  await redis.del(`otp:${phone}`);
}

async function rateIncr(phone: string): Promise<number> {
  const key = `rate:${phone}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, OTP_TTL_SECONDS);
  }
  return count;
}

async function createServer() {
  const app = express();

  app.set('trust proxy', 1);

  if (isProd) {
    app.use(
      helmet({
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'img-src': ["'self'", 'data:', 'blob:', 'https:', 'https://images.unsplash.com'],
            'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            'connect-src': ["'self'", 'https:*', 'wss:*'],
          },
        },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      })
    );
  }

  app.use(cors({ origin: isProd ? 'https://boya.bcshopir.ir' : true, credentials: true }));
  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ limit: '4mb', extended: true }));
  app.use(cookieParser());

  // Run database migrations safely
  await runMigrations();

  if (process.env.RUN_SEED === 'true') {
    try {
      await seedDatabase();
      console.log('[DB BOOT] Database tables and seed data synchronized successfully.');
    } catch (err) {
      console.error('[DB BOOT CRITICAL ERROR]', err);
    }
  } else {
    console.log('[DB BOOT] Skipping seed execution (RUN_SEED != true).');
  }

  const dockerUploads = '/app/uploads';
  const localUploads = path.resolve(process.cwd(), 'public/uploads');
  const uploadsDir = fs.existsSync(dockerUploads) ? dockerUploads : localUploads;
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(localUploads)) fs.mkdirSync(localUploads, { recursive: true });

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
    else if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    )
      ext = 'png';
    else if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    )
      ext = 'webp';
    else throw new Error('فرمت فایل مجاز نیست. تنها فرمت‌های jpg, png, webp پشتیبانی می‌شوند.');
    return { buffer, ext };
  }

  // ==========================================
  // API ROUTES
  // ==========================================

  // Health probe (Cloud Run liveness & startup probes)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Secure image upload
  app.post('/api/upload', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rawData = req.body.fileData || req.body.base64;
      const { buffer, ext } = validateAndProcessImage(rawData);
      const safeName = `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      fs.writeFileSync(path.join(uploadsDir, safeName), buffer);
      res.json({ success: true, url: `/uploads/${safeName}` });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'خطا در بارگذاری تصویر.' });
    }
  });

  // --- Auth: OTP with Redis ---
  app.post('/api/auth/send-otp', async (req, res) => {
    try {
      const { phone: rawPhone } = req.body;
      const phone = schemas.phoneSchema.parse(normalizePhone(rawPhone));

      const attempts = await rateIncr(phone);
      if (attempts > 5) {
        return res.status(429).json({ error: 'تعداد درخواست بیش از حد مجاز است. لطفاً چند دقیقه صبر کنید.' });
      }

      const otpCode = crypto.randomInt(10000, 99999).toString();
      await otpSet(phone, { code: otpCode, attempts: 0 });

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
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در پردازش شماره همراه.' });
    }
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const data = schemas.otpVerifySchema.parse({ ...req.body, phone: normalizePhone(req.body.phone) });
      const { phone, code, fullName } = data;

      const stored = await otpGet(phone);
      if (!stored) return res.status(400).json({ error: 'کد منقضی شده یا یافت نشد.' });

      if (stored.code !== code.trim()) {
        stored.attempts = (stored.attempts || 0) + 1;
        if (stored.attempts >= 3) {
          await otpDel(phone);
          return res.status(401).json({ error: 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. دوباره درخواست دهید.' });
        }
        await otpSet(phone, stored);
        return res.status(400).json({ error: `کد اشتباه است. (${3 - stored.attempts} تلاش باقی مانده)` });
      }

      await otpDel(phone);

      let dbUser = await db.select().from(users).where(eq(users.phone, phone)).limit(1).then((r) => r[0]);

      if (dbUser?.status === 'suspended') {
        await logSecurityAction({
          action: 'UNAUTHORIZED_ACCESS',
          targetId: String(dbUser.id),
          details: { reason: 'Suspended login attempt' },
          ipAddress: req.ip,
        });
        return res.status(403).json({ error: 'حساب کاربری مسدود است.' });
      }

      if (!dbUser) {
        const [newUser] = await db
          .insert(users)
          .values({
            uid: `phone_${phone}`,
            phone,
            fullName: fullName || `کاربر ${phone.slice(-4)}`,
            email: `${phone}@boya.ir`,
            role: 'customer',
          })
          .returning();
        dbUser = newUser;
      }

      await logSecurityAction({ actorId: dbUser.id, action: 'LOGIN', ipAddress: req.ip });

      const token = generateJwtToken({
        id: dbUser.id,
        uid: dbUser.uid,
        phone: dbUser.phone,
        role: dbUser.role,
        salonId: dbUser.salonId ? String(dbUser.salonId) : null,
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      res.json({ user: redactUserPII(dbUser, dbUser) });
    } catch (err: any) {
      console.error('[VERIFY-OTP ERROR]', err);
      if (err.cause) {
        console.error('[VERIFY-OTP CAUSE]', err.cause);
      }
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطای احراز هویت.' });
    }
  });

  app.post('/api/auth/logout', requireAuth, async (req: AuthRequest, res) => {
    const token = req.cookies.token;
    if (token) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      await db.insert(revokedTokens).values({ token, expiresAt: expiry }).onConflictDoNothing().catch(() => {});
    }
    if (req.dbUser) {
      await logSecurityAction({ actorId: req.dbUser.id, action: 'LOGOUT', ipAddress: req.ip });
    }
    res.clearCookie('token', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' });
    res.json({ success: true });
  });

  // --- Profile ---
  app.get('/api/profile', requireAuth, (req: AuthRequest, res) => {
    res.json(redactUserPII(req.dbUser, req.dbUser));
  });

  app.patch('/api/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const allowed = schemas.userUpdateSchema.pick({ fullName: true, avatar: true, email: true }).parse(req.body);
      const [updated] = await db.update(users).set(allowed).where(eq(users.id, req.dbUser.id)).returning();
      if (allowed.avatar) {
        await db.update(specialists).set({ avatarUrl: allowed.avatar }).where(eq(specialists.userId, req.dbUser.id)).catch(() => {});
      }
      res.json({ success: true, user: redactUserPII(updated, updated) });
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش پروفایل.' });
    }
  });

  // --- Salons ---
  app.get('/api/salons', async (_req, res) => {
    try {
      const list = await db.query.salons.findMany({
        where: eq(salons.isApproved, true),
        with: {
          services: true,
          specialists: {
            with: { user: true, portfolio: true },
          },
        },
      });
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت لیست سالن‌ها.' });
    }
  });

  // Fetch a single salon with its services and specialists
  app.get('/api/salons/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: 'شناسه سالن نامعتبر است.' });
      }
      const salon = await db.query.salons.findFirst({
        where: eq(salons.id, id),
        with: {
          services: true,
          specialists: {
            with: { user: true, portfolio: true },
          },
        },
      });
      if (!salon) {
        return res.status(404).json({ error: 'سالن مورد نظر یافت نشد.' });
      }
      res.json(salon);
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت اطلاعات سالن.' });
    }
  });

  app.post('/api/salons', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const data = schemas.salonCreateSchema.parse(req.body);
      const tenantId = `tenant_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const insertPayload: any = {
        ...data,
        tenantId,
        isApproved: true,
        rating: '5.00',
        reviewsCount: 0,
      };
      const rawGallery = (req.body as any).gallery;
      if (Array.isArray(rawGallery)) {
        insertPayload.gallery = JSON.stringify(rawGallery);
      }
      const [newSalon] = await db
        .insert(salons)
        .values(insertPayload)
        .returning();
      await logSecurityAction({ actorId: req.dbUser.id, action: 'SALON_CREATE', targetId: String(newSalon.id), ipAddress: req.ip });
      res.status(201).json(newSalon);
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ایجاد سالن جدید.' });
    }
  });

  app.get(
    '/api/managed/salons',
    requireAuth,
    requireRole(['super_admin', 'salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager']),
    async (req: AuthRequest, res) => {
      try {
        const salonId = req.dbUser.salonId;
        const rows = await db.query.salons.findMany({
          where: req.dbUser.role === 'super_admin' ? undefined : eq(salons.id, Number(salonId)),
          with: { services: true, specialists: { with: { user: true, portfolio: true } } },
        });
        res.json(rows);
      } catch (err) {
        res.status(500).json({ error: 'خطا در دریافت لیست سالن‌های مدیریتی.' });
      }
    }
  );

  app.patch('/api/salons/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (req.dbUser.role !== 'super_admin' && Number(req.dbUser.salonId) !== id) {
        return res.status(403).json({ error: 'شما فقط مجاز به ویرایش سالن خود هستید.' });
      }
      const data = schemas.salonUpdateSchema.parse(req.body);
      const updatePayload: any = { ...data };
      if (Array.isArray(data.gallery)) {
        updatePayload.gallery = JSON.stringify(data.gallery);
      }
      const [updated] = await db.update(salons).set(updatePayload).where(eq(salons.id, id)).returning();
      res.json({ success: true, salon: updated });
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش اطلاعات سالن.' });
    }
  });

  app.delete('/api/salons/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(salons).where(eq(salons.id, id));
      await logSecurityAction({ actorId: req.dbUser.id, action: 'SALON_DELETE', targetId: String(id), ipAddress: req.ip });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف سالن.' });
    }
  });

  // Calculate and update the salon's average rating in the database
  app.post('/api/salons/:id/reviews', requireAuth, async (req: AuthRequest, res) => {
    try {
      const salonId = Number(req.params.id);
      const { rating } = req.body;
      if (!Number.isFinite(salonId) || rating === undefined || rating === null) {
        return res.status(400).json({ error: 'شناسه سالن و امتیاز الزامی است.' });
      }
      const numericRating = Number(rating);
      if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ error: 'امتیاز باید عددی بین ۱ تا ۵ باشد.' });
      }

      const salon = await db.select().from(salons).where(eq(salons.id, salonId)).limit(1).then((r) => r[0]);
      if (!salon) {
        return res.status(404).json({ error: 'سالن مورد نظر یافت نشد.' });
      }

      const prevCount = salon.reviewsCount || 0;
      const prevRating = Number(salon.rating) || 5.0;
      const newCount = prevCount + 1;
      const newAverage = Number(((prevRating * prevCount + numericRating) / newCount).toFixed(2));

      const [updated] = await db
        .update(salons)
        .set({
          reviewsCount: newCount,
          rating: String(newAverage),
        })
        .where(eq(salons.id, salonId))
        .returning();

      await logSecurityAction({
        actorId: req.dbUser.id,
        action: 'SALON_REVIEW',
        targetId: String(salonId),
        details: { rating: numericRating, newAverage, newCount },
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        reviewsCount: newCount,
        rating: updated.rating,
      });
    } catch (err) {
      res.status(500).json({ error: 'خطا در ثبت نظر و محاسبه امتیاز سالن.' });
    }
  });

  // --- Services (Direct SQL WHERE filtering on salonId) ---
  app.get('/api/services', async (req, res) => {
    try {
      const rawSalonId = req.query.salonId;
      const salonId = rawSalonId ? Number(rawSalonId) : undefined;
      const list = await db
        .select()
        .from(services)
        .where(salonId !== undefined && !Number.isNaN(salonId) ? eq(services.salonId, salonId) : undefined)
        .orderBy(desc(services.createdAt));
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت لیست خدمات.' });
    }
  });

  app.post('/api/services', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const data = schemas.serviceCreateSchema.parse(req.body);
      const salonId = req.dbUser.role === 'super_admin' ? Number(data.salonId) : Number(req.dbUser.salonId);
      if (!salonId) return res.status(403).json({ error: 'سالن نامعتبر است.' });
      const [newService] = await db
        .insert(services)
        .values({
          ...data,
          salonId,
          price: String(data.price),
        })
        .returning();
      res.status(201).json(newService);
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ایجاد خدمت جدید.' });
    }
  });

  app.patch('/api/services/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const data = schemas.serviceUpdateSchema.parse(req.body);
      const updateData: any = { ...data };
      if (data.price !== undefined) updateData.price = String(data.price);
      const [updated] = await db.update(services).set(updateData).where(eq(services.id, id)).returning();
      res.json(updated);
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش خدمت.' });
    }
  });

  app.delete('/api/services/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(services).where(eq(services.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف خدمت.' });
    }
  });

  // --- Specialists (Direct SQL WHERE filtering on salonId) ---
  app.get('/api/specialists', async (req, res) => {
    try {
      const rawSalonId = req.query.salonId;
      const salonId = rawSalonId ? Number(rawSalonId) : undefined;
      const list = await db.query.specialists.findMany({
        where: salonId !== undefined && !Number.isNaN(salonId) ? eq(specialists.salonId, salonId) : undefined,
        with: {
          user: true,
          portfolio: true,
        },
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت لیست متخصصین.' });
    }
  });

  app.post('/api/specialists', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const data = schemas.specialistCreateSchema.parse(req.body);
      const salonId = req.dbUser.role === 'super_admin' ? Number(data.salonId) : Number(req.dbUser.salonId);
      const [newSpecialist] = await db
        .insert(specialists)
        .values({
          ...data,
          userId: Number(data.userId),
          salonId,
          isVerified: true,
        })
        .returning();
      res.status(201).json(newSpecialist);
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ثبت متخصص.' });
    }
  });

  app.patch('/api/specialists/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const data = schemas.specialistUpdateSchema.parse(req.body);
      const updateData: any = { ...data };
      if (data.userId) updateData.userId = Number(data.userId);
      if (data.salonId) updateData.salonId = Number(data.salonId);
      const [updated] = await db.update(specialists).set(updateData).where(eq(specialists.id, id)).returning();
      res.json(updated);
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش متخصص.' });
    }
  });

  app.delete('/api/specialists/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(specialists).where(eq(specialists.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف متخصص.' });
    }
  });

  app.post(
    '/api/specialists/portfolio',
    requireAuth,
    requireRole(['super_admin', 'salon_admin', 'salon_specialist', 'mobile_specialist']),
    async (req: AuthRequest, res) => {
      try {
        const { specialistId, title, imageUrl, category } = req.body;
        if (!title || !imageUrl) return res.status(400).json({ error: 'عنوان و تصویر الزامی است.' });
        let specId = Number(specialistId);
        if (!specId) {
          const sp = await db.select().from(specialists).where(eq(specialists.userId, req.dbUser.id)).limit(1).then((r) => r[0]);
          if (sp) specId = sp.id;
        }
        if (!specId) return res.status(400).json({ error: 'متخصص مشخص نشده است.' });
        const [item] = await db
          .insert(portfolioItems)
          .values({
            specialistId: specId,
            title: String(title).trim(),
            imageUrl: String(imageUrl).trim(),
            category: category || 'general',
            likesCount: 0,
          })
          .returning();
        res.status(201).json(item);
      } catch (err) {
        res.status(500).json({ error: 'خطا در ثبت نمونه کار.' });
      }
    }
  );

  app.delete(
    '/api/specialists/portfolio/:id',
    requireAuth,
    requireRole(['super_admin', 'salon_admin', 'salon_specialist', 'mobile_specialist']),
    async (req: AuthRequest, res) => {
      try {
        const id = Number(req.params.id);
        await db.delete(portfolioItems).where(eq(portfolioItems.id, id));
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: 'خطا در حذف نمونه کار.' });
      }
    }
  );

  // --- Users & Staff ---
  app.get('/api/users', requireAuth, requireRole(['super_admin', 'salon_admin', 'line_manager']), async (req: AuthRequest, res) => {
    try {
      let list;
      if (req.dbUser.role === 'super_admin') {
        const salonIdFilter = req.query.salonId ? Number(req.query.salonId) : undefined;
        list = await db
          .select()
          .from(users)
          .where(salonIdFilter ? eq(users.salonId, salonIdFilter) : undefined)
          .orderBy(desc(users.createdAt));
      } else {
        const salonId = Number(req.dbUser.salonId);
        if (!salonId) return res.status(403).json({ error: 'سالن نامعتبر است.' });
        list = await db
          .select()
          .from(users)
          .where(eq(users.salonId, salonId))
          .orderBy(desc(users.createdAt));
      }
      res.json(list.map((u) => redactUserPII(u, req.dbUser)));
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت لیست کاربران.' });
    }
  });

  app.post('/api/users', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const data = schemas.userCreateSchema.parse(req.body);
      const salonId =
        req.dbUser.role === 'super_admin' && data.salonId
          ? Number(data.salonId)
          : req.dbUser.salonId
          ? Number(req.dbUser.salonId)
          : null;
      const phone = normalizePhone(data.phone);
      const existing = await db.select().from(users).where(eq(users.phone, phone)).limit(1).then((r) => r[0]);
      if (existing) {
        return res.status(400).json({ error: 'کاربری با این شماره همراه قبلاً ثبت شده است.' });
      }
      const [newUser] = await db
        .insert(users)
        .values({
          uid: `phone_${phone}_${Date.now()}`,
          phone,
          fullName: data.fullName,
          email: data.email || `${phone}@boya.ir`,
          role: data.role,
          salonId,
          status: 'active',
        })
        .returning();
      await logSecurityAction({ actorId: req.dbUser.id, action: 'USER_CREATE', targetId: String(newUser.id), ipAddress: req.ip });
      res.status(201).json(redactUserPII(newUser, req.dbUser));
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ثبت کاربر جدید.' });
    }
  });

  app.patch('/api/users/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const data = schemas.userUpdateSchema.parse(req.body);
      const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
      await logSecurityAction({ actorId: req.dbUser.id, action: 'USER_UPDATE', targetId: String(id), ipAddress: req.ip });
      res.json(redactUserPII(updated, req.dbUser));
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش کاربر.' });
    }
  });

  app.delete('/api/users/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(users).where(eq(users.id, id));
      await logSecurityAction({ actorId: req.dbUser.id, action: 'USER_DELETE', targetId: String(id), ipAddress: req.ip });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف کاربر.' });
    }
  });

  app.get('/api/line-manager/staff', requireAuth, requireRole(['super_admin', 'salon_admin', 'line_manager']), async (req: AuthRequest, res) => {
    try {
      const salonId = Number(req.dbUser.salonId);
      let staff: any[] = [];
      if (req.dbUser.role === 'super_admin') {
        staff = await db
          .select()
          .from(users)
          .where(sql`role IN ('salon_specialist', 'mobile_specialist', 'line_manager')`);
      } else if (salonId) {
        staff = await db
          .select()
          .from(users)
          .where(and(eq(users.salonId, salonId), sql`role IN ('salon_specialist', 'mobile_specialist', 'line_manager')`));
      }
      res.json(staff.map((u) => redactUserPII(u, req.dbUser)));
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت لیست پرسنل.' });
    }
  });

  // --- Admin Profile ---
  app.get('/api/admin/profile', requireAuth, requireRole(['super_admin']), async (_req, res) => {
    try {
      let profile = await db.select().from(adminProfile).limit(1).then((r) => r[0]);
      if (!profile) {
        const [newProf] = await db
          .insert(adminProfile)
          .values({
            fullName: 'مدیر ارشد سامانه بویا',
            phone: '09121111111',
            email: 'admin@boya.ir',
            positionTitle: 'مدیر ارشد سیستم',
            adminCode: 'BY-SA-01',
          })
          .returning();
        profile = newProf;
      }
      res.json(profile);
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت پروفایل مدیریت.' });
    }
  });

  app.patch('/api/admin/profile', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const data = schemas.adminProfileUpdateSchema.parse(req.body);
      const existing = await db.select().from(adminProfile).limit(1).then((r) => r[0]);
      let result;
      if (existing) {
        const [updated] = await db.update(adminProfile).set(data).where(eq(adminProfile.id, existing.id)).returning();
        result = updated;
      } else {
        const [created] = await db
          .insert(adminProfile)
          .values({
            fullName: data.fullName || 'مدیر ارشد سامانه بویا',
            phone: data.phone || '09121111111',
            email: data.email || 'admin@boya.ir',
            ...data,
          })
          .returning();
        result = created;
      }
      res.json(result);
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش پروفایل مدیریت.' });
    }
  });

  // --- Notifications & Melipayamak Broadcast ---
  app.get('/api/notifications', async (_req, res) => {
    try {
      const list = await db.select().from(notifications).where(eq(notifications.isActive, true)).orderBy(desc(notifications.createdAt));
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت اعلانات.' });
    }
  });

  app.post('/api/notifications', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const data = schemas.notificationCreateSchema.parse(req.body);
      const [n] = await db.insert(notifications).values(data).returning();
      res.status(201).json(n);
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ثبت اعلان.' });
    }
  });

  app.patch('/api/notifications/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const [updated] = await db.update(notifications).set(req.body).where(eq(notifications.id, id)).returning();
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'خطا در ویرایش اعلان.' });
    }
  });

  app.delete('/api/notifications/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(notifications).where(eq(notifications.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف اعلان.' });
    }
  });

  // Melipayamak Bulk SMS Broadcast
  app.post('/api/notifications/broadcast', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const { title, content, targetAudience, testPhone } = req.body;
      if (!title || !content) return res.status(400).json({ error: 'عنوان و متن پیامک الزامی است.' });

      let targetPhones: string[] = [];
      if (testPhone) {
        targetPhones = [normalizePhone(testPhone)];
      } else {
        const allUsers = await db.select().from(users);
        let filteredUsers = allUsers;
        if (targetAudience === 'customer') {
          filteredUsers = allUsers.filter((u) => u.role === 'customer');
        } else if (targetAudience === 'salon') {
          filteredUsers = allUsers.filter((u) =>
            ['salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager'].includes(u.role)
          );
        }
        targetPhones = filteredUsers.map((u) => u.phone).filter(Boolean);
      }

      let sentCount = 0;
      for (const phone of targetPhones) {
        try {
          await sendMeliPayamakSms(phone, `${title}\n${content}`);
          sentCount++;
        } catch {
          // ignore individual phone failure
        }
      }

      const [n] = await db
        .insert(notifications)
        .values({
          title: String(title).trim(),
          content: String(content).trim(),
          type: 'promotional',
          targetAudience: targetAudience || 'all',
          channel: 'sms',
          isActive: true,
          badgeText: `${sentCount} پیامک ارسال شد`,
        })
        .returning();

      res.status(201).json({ success: true, sentCount, notification: n });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'خطا در ارسال پیامک همگانی.' });
    }
  });

  // --- Audit Logs (Super Admin only, limit 200) ---
  app.get('/api/audit-logs', requireAuth, requireRole(['super_admin']), async (_req, res) => {
    try {
      const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200);
      res.json(logs);
    } catch {
      res.status(500).json({ error: 'خطا در دریافت لاگ‌های امنیتی.' });
    }
  });

  // --- Support Tickets Lifecycle ---
  app.get('/api/tickets', requireAuth, async (req: AuthRequest, res) => {
    try {
      const list =
        req.dbUser.role === 'super_admin'
          ? await db.select().from(supportTickets).orderBy(desc(supportTickets.updatedAt))
          : await db.select().from(supportTickets).where(eq(supportTickets.userId, req.dbUser.id)).orderBy(desc(supportTickets.updatedAt));
      const enriched = await Promise.all(
        list.map(async (t) => ({
          ...t,
          messages: await db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, t.id)).orderBy(ticketMessages.createdAt),
        }))
      );
      res.json(enriched);
    } catch {
      res.status(500).json({ error: 'خطا در دریافت تیکت‌های پشتیبانی.' });
    }
  });

  app.post('/api/tickets', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { subject, category, priority, message } = req.body;
      if (!subject || !message) return res.status(400).json({ error: 'موضوع و متن پیام الزامی است.' });
      const [t] = await db
        .insert(supportTickets)
        .values({
          userId: req.dbUser.id,
          ticketCode: `TK-${crypto.randomInt(1000, 9999)}`,
          subject: String(subject).trim(),
          category: category || 'general',
          priority: priority || 'medium',
          status: 'open',
        })
        .returning();
      const [m] = await db
        .insert(ticketMessages)
        .values({
          ticketId: t.id,
          senderId: req.dbUser.id,
          senderRole: req.dbUser.role,
          message: String(message).trim(),
        })
        .returning();
      res.status(201).json({ ...t, messages: [m] });
    } catch {
      res.status(500).json({ error: 'خطا در ایجاد تیکت پشتیبانی.' });
    }
  });

  app.post('/api/tickets/:id/messages', requireAuth, async (req: AuthRequest, res) => {
    try {
      const tid = Number(req.params.id);
      const { message } = req.body;
      if (!message || !Number.isFinite(tid)) return res.status(400).json({ error: 'متن پیام الزامی است.' });
      const t = await db.select().from(supportTickets).where(eq(supportTickets.id, tid)).limit(1).then((r) => r[0]);
      if (!t) return res.status(404).json({ error: 'تیکت یافت نشد.' });
      if (req.dbUser.role !== 'super_admin' && t.userId !== req.dbUser.id) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز.' });
      }
      const [m] = await db
        .insert(ticketMessages)
        .values({
          ticketId: tid,
          senderId: req.dbUser.id,
          senderRole: req.dbUser.role,
          message: String(message).trim(),
        })
        .returning();
      await db
        .update(supportTickets)
        .set({ updatedAt: new Date(), status: req.dbUser.role === 'super_admin' ? 'in_progress' : 'open' })
        .where(eq(supportTickets.id, tid));
      res.status(201).json(m);
    } catch {
      res.status(500).json({ error: 'خطا در ارسال پیام.' });
    }
  });

  app.patch('/api/tickets/:id/status', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const tid = Number(req.params.id);
      const { status } = req.body;
      if (!status || !Number.isFinite(tid)) return res.status(400).json({ error: 'وضعیت الزامی است.' });
      const [updated] = await db
        .update(supportTickets)
        .set({ status, updatedAt: new Date() })
        .where(eq(supportTickets.id, tid))
        .returning();
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'خطا در تغییر وضعیت تیکت.' });
    }
  });

  // --- Bookings ---
  app.get('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const list = await getBookingsForUser(req.dbUser);
      res.json(list.map((b: any) => processBookingData(b, req.dbUser)));
    } catch (err: any) {
      res.status(err.message === 'FORBIDDEN_NO_SALON' ? 403 : 500).json({ error: 'خطا در دریافت لیست نوبت‌ها.' });
    }
  });

  app.post('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = schemas.bookingCreateSchema.parse(req.body);
      const serviceRecord = await db.select().from(services).where(eq(services.id, Number(data.serviceId))).limit(1).then((r) => r[0]);
      if (!serviceRecord) return res.status(400).json({ error: 'خدمت یافت نشد.' });
      const canonicalPrice = String(serviceRecord.price);
      const booking = await createBooking({ ...data, customerId: req.dbUser.id, price: canonicalPrice });
      await sendMeliPayamakSms(req.dbUser.phone, `نوبت شما ثبت شد. کد رهگیری: ${booking?.trackingCode}`).catch(() => {});
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
      res.status(500).json({ error: 'خطا در تغییر وضعیت نوبت.' });
    }
  });

  // --- Static & Frontend Serving ---
  let vite: any;
  if (!isProd) {
    vite = await createViteServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
  }

  app.get('*', async (req, res, next) => {
    try {
      const url = req.originalUrl;
      let template = fs.readFileSync(path.resolve(__dirname, isProd ? 'dist/index.html' : 'index.html'), 'utf-8');
      if (!isProd) template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      next(e);
    }
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[SERVER ERROR]', err);
    res.status(500).json({ error: 'خطای داخلی سرور رخ داده است.' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [READY] Server running on port ${PORT} [Mode: ${isProd ? 'Production' : 'Development'}]`);
    console.log(`🌍 [READY] Health check ready at http://0.0.0.0:${PORT}/api/health`);
  });
}

createServer().catch((err) => {
  console.error('[FATAL SERVER BOOT ERROR]', err);
});
