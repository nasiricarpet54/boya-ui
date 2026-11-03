import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
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
import { users, salons, services, bookings as bookingsTable, revokedTokens, notifications, adminProfile, specialists, portfolioItems, auditLogs, supportTickets, ticketMessages } from './src/db/schema.ts';
import { eq, desc, and } from 'drizzle-orm';
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

// P3-15: Redis Setup for Rate Limiting in Production
let redisClient: Redis | null = null;
if (isProd && process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL);
    redisClient.on('error', (err) => console.error('[REDIS ERROR]', err));
  } catch (e) {
    console.error('[REDIS INIT FAIL] Falling back to memory store.');
  }
}

// Apply Rate Limiter to all API routes


const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();
const sendOtpRateLimit = new Map<string, { count: number; resetAt: number }>();

// Periodic memory cleanup to prevent memory leaks and resource exhaustion
setInterval(() => {
  const now = Date.now();
  for (const [phone, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(phone);
    }
  }
  for (const [phone, record] of sendOtpRateLimit.entries()) {
    if (now > record.resetAt) {
      sendOtpRateLimit.delete(phone);
    }
  }
}, 3 * 60 * 1000).unref();

async function createServer() {
  const app = express();
  
  // P3-15: Trust Proxy (Essential for Rate Limiting in Cloud Run/Proxy environments)
  app.set('trust proxy', 1);

  // P3-14: Helmet for Security Headers (CSP, Referrer-Policy, etc.)
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

  // P3-17: Unified CORS setup
  app.use(cors({
    origin: true, // Allow all for now, but restricts in production if needed
    credentials: true,
  }));

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));
  app.use(cookieParser());

  // Apply Rate Limiter to all API routes
  // Run Drizzle migrations on startup
  await runMigrations();

  // Synchronous database seeding on startup if RUN_SEED is enabled
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

  // Support both /app/uploads (Docker volume) and public/uploads
  const dockerUploads = '/app/uploads';
  const localUploads = path.resolve(process.cwd(), 'public/uploads');
  const uploadsDir = fs.existsSync(dockerUploads) ? dockerUploads : localUploads;
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(localUploads)) fs.mkdirSync(localUploads, { recursive: true });
  
  app.use('/uploads', express.static(uploadsDir));
  app.use('/uploads', express.static(localUploads));

  function validateAndProcessImage(rawData: string): { buffer: Buffer; ext: string } {
    if (!rawData || typeof rawData !== 'string') {
      throw new Error('داده تصویر ارسال نشده است.');
    }

    if (rawData.length > 7 * 1024 * 1024) {
      throw new Error('حجم فایل بیش از حد مجاز است (حداکثر ۵ مگابایت).');
    }

    const matches = rawData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    const base64Data = matches ? matches[2] : rawData;
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 5 * 1024 * 1024) {
      throw new Error('حجم فایل بیش از حد مجاز است (حداکثر ۵ مگابایت).');
    }

    const sampleHeader = buffer.toString('utf8', 0, Math.min(buffer.length, 512)).toLowerCase();
    if (sampleHeader.includes('<svg') || sampleHeader.includes('<html') || sampleHeader.includes('<script') || sampleHeader.includes('javascript:')) {
      throw new Error('فایل‌های SVG یا حاوی کدهای اسکریپت قابل قبول نیستند.');
    }

    let ext = '';
    // JPEG: FF D8 FF
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      ext = 'jpg';
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    else if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a) {
      ext = 'png';
    }
    // WEBP: RIFF ... WEBP
    else if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      ext = 'webp';
    } else {
      throw new Error('فرمت فایل نامعتبر است. فقط تصاویر مجاز با فرمت JPEG، PNG و WEBP پذیرفته می‌شوند.');
    }

    return { buffer, ext };
  }

  // File & Image Upload endpoint (permanent disk storage)
  app.post('/api/upload', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rawData = req.body.fileData || req.body.base64;
      const { buffer, ext } = validateAndProcessImage(rawData);

      const safeName = `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const filePath = path.join(uploadsDir, safeName);
      fs.writeFileSync(filePath, buffer);

      if (uploadsDir !== localUploads) {
        try {
          fs.writeFileSync(path.join(localUploads, safeName), buffer);
        } catch (_) {}
      }

      const fileUrl = `/uploads/${safeName}`;
      res.json({ success: true, url: fileUrl });
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[UPLOAD ERROR]', error?.message || error);
      res.status(400).json({ error: error?.message || 'خطا در ذخیره‌سازی فایل تصویر.' });
    }
  });

  // --- Auth ---

  app.post('/api/auth/send-otp', async (req, res) => {
    try {
      const { phone: rawPhone } = req.body;
      const phone = schemas.phoneSchema.parse(normalizePhone(rawPhone));
      const now = Date.now();
      
      const record = sendOtpRateLimit.get(phone);
      if (record && now < record.resetAt && record.count >= 3) return res.status(429).json({ error: 'محدودیت تعداد درخواست. ۵ دقیقه صبر کنید.' });
      
      sendOtpRateLimit.set(phone, { count: (record?.count || 0) + 1, resetAt: record?.resetAt || (now + 5 * 60 * 1000) });

      const otpCode = crypto.randomInt(10000, 99999).toString();
      otpStore.set(phone, { code: otpCode, expiresAt: now + 5 * 60 * 1000, attempts: 0 });

      if (process.env.NODE_ENV === 'development') {
        console.log(`📲 [OTP LOG] ${phone} -> ${otpCode}`);
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
      const now = Date.now();

      const stored = otpStore.get(phone);
      if (!stored || now > stored.expiresAt) return res.status(400).json({ error: 'کد یافت نشد یا منقضی شده.' });

      if (stored.code !== code.trim()) {
        stored.attempts++;
        if (stored.attempts >= 3) {
          otpStore.delete(phone);
          return res.status(401).json({ error: 'تلاش‌های ناموفق زیاد. کد ابطال شد.' });
        }
        return res.status(400).json({ error: `کد اشتباه است. (${3 - stored.attempts} تلاش باقی‌مانده)` });
      }

      otpStore.delete(phone);

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

      const token = generateJwtToken({ id: dbUser.id, uid: dbUser.uid, phone: dbUser.phone, role: dbUser.role, salonId: dbUser.salonId ? String(dbUser.salonId) : null });

      res.cookie('token', token, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/' });
      
      const { email: _, phone: __, ...safeUser } = dbUser;
      res.json({ user: safeUser });
    } catch (err) {
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

  app.get('/api/profile', requireAuth, (req: AuthRequest, res) => res.json(req.dbUser));

  app.patch('/api/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const allowed = schemas.userUpdateSchema.pick({ fullName: true, avatar: true, email: true }).parse(req.body);
      const updateData: Record<string, string | null> = {};
      if (allowed.fullName !== undefined) updateData.fullName = allowed.fullName;
      if (allowed.avatar !== undefined) updateData.avatar = allowed.avatar;
      if (allowed.email !== undefined) updateData.email = allowed.email;

      const [updated] = await db.update(users).set(updateData).where(eq(users.id, req.dbUser.id)).returning();
      
      // If user is also a specialist, sync avatarUrl
      if (allowed.avatar) {
        await db.update(specialists).set({ avatarUrl: allowed.avatar }).where(eq(specialists.userId, req.dbUser.id)).catch(() => {});
      }

      res.json({ success: true, user: updated });
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش پروفایل.' });
    }
  });

  // --- Specialists Portfolio Management ---
  app.post('/api/specialists/portfolio', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { title, imageUrl, category, specialistId } = req.body;
      if (!title || !imageUrl) return res.status(400).json({ error: 'عنوان و تصویر الزامی است.' });

      // Portfolio items belong only to the authenticated specialist; never create a verified profile implicitly.
      const spec = await db.select().from(specialists).where(eq(specialists.userId, req.dbUser.id)).limit(1).then(r => r[0]);
      if (!spec) return res.status(403).json({ error: 'پروفایل متخصص تاییدشده یافت نشد.' });
      if (specialistId && Number(specialistId) !== spec.id) return res.status(403).json({ error: 'عدم دسترسی به پروفایل متخصص.' });

      const [item] = await db.insert(portfolioItems).values({
        specialistId: spec.id,
        title: String(title).trim(),
        imageUrl: String(imageUrl).trim(),
        category: String(category || 'نمونه کار').trim(),
        likesCount: 1,
      }).returning();

      res.status(201).json(item);
    } catch (err) {
      console.error('[PORTFOLIO CREATE ERROR]', err);
      res.status(500).json({ error: 'خطا در ثبت نمونه کار.' });
    }
  });

  app.delete('/api/specialists/portfolio/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const item = await db.select().from(portfolioItems).where(eq(portfolioItems.id, id)).limit(1).then(r => r[0]);
      if (!item) return res.status(404).json({ error: 'نمونه کار یافت نشد.' });

      const spec = await db.select().from(specialists).where(eq(specialists.id, item.specialistId)).limit(1).then(r => r[0]);
      if (req.dbUser.role !== 'super_admin' && (!spec || spec.userId !== req.dbUser.id)) {
        return res.status(403).json({ error: 'عدم دسترسی به حذف این نمونه‌کار.' });
      }

      await db.delete(portfolioItems).where(eq(portfolioItems.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف نمونه کار.' });
    }
  });

  // --- Salons ---

  app.get('/api/salons/:id', async (req, res) => {
    try {
      const salonId = Number(req.params.id);
      if (!Number.isFinite(salonId)) {
        return res.status(400).json({ error: 'شناسه سالن نامعتبر است.' });
      }

      const salon = await db.query.salons.findFirst({
        where: eq(salons.id, salonId),
        with: {
          services: true,
          specialists: { with: { user: true, portfolio: true } },
        },
      });

      if (!salon || !salon.isApproved) {
        return res.status(404).json({ error: 'سالن مورد نظر یافت نشد یا هنوز تایید نشده است.' });
      }

      res.json({
        id: salon.id,
        tenantId: salon.tenantId,
        name: salon.name,
        address: salon.address,
        province: salon.province,
        city: salon.city,
        district: salon.district,
        latitude: salon.latitude,
        longitude: salon.longitude,
        rating: Number(salon.rating) || 5,
        reviewsCount: salon.reviewsCount,
        isVip: salon.isVip,
        vipBadgeLabel: salon.vipBadgeLabel,
        isMobileServiceActive: salon.isMobileServiceActive,
        coverImage: salon.coverImage,
        gallery: salon.gallery ? (salon.gallery.startsWith('[') ? JSON.parse(salon.gallery) : [salon.gallery]) : (salon.coverImage ? [salon.coverImage] : []),
        services: salon.services.filter(s => s.publicationStatus === 'active').map(s => ({
          id: s.id,
          salonId: s.salonId,
          serviceLineId: s.serviceLineId,
          name: s.name,
          description: s.description,
          price: Number(s.price) || 0,
          durationMinutes: s.durationMinutes,
          isMobileAvailable: s.isMobileAvailable,
          imageUrl: s.imageUrl,
        })),
        specialists: salon.specialists.filter(sp => sp.isVerified && sp.publicationStatus === 'active' && sp.user?.status === 'active').map(sp => ({
          id: sp.id,
          salonId: sp.salonId,
          specialtyLine: sp.specialtyLine,
          bio: sp.bio,
          experienceYears: sp.experienceYears,
          avatarUrl: sp.avatarUrl,
          name: sp.user?.fullName || 'متخصص زیبایی',
          phone: sp.user?.phone || '',
          portfolio: sp.portfolio.map(item => ({
            id: item.id,
            title: item.title,
            imageUrl: item.imageUrl,
            category: item.category,
            likesCount: item.likesCount,
          })),
        })),
      });
    } catch (err: any) {
      console.error('[API SALON BY ID ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت اطلاعات سالن.' });
    }
  });

  // Staff need a private view of unpublished records for review and management.
  // Customer discovery remains on /api/salons, which applies publication filters.
  app.get('/api/managed/salons', requireAuth, requireRole(['super_admin', 'salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager']), async (req: AuthRequest, res) => {
    try {
      const salonId = req.dbUser.salonId;
      if (req.dbUser.role !== 'super_admin' && !salonId) return res.status(403).json({ error: 'سالن به حساب شما متصل نیست.' });
      const rows = await db.query.salons.findMany({
        where: req.dbUser.role === 'super_admin' ? undefined : eq(salons.id, Number(salonId)),
        with: { services: true, specialists: { with: { user: true, portfolio: true } } },
      });
      res.json(rows.map((salon) => ({
        ...salon,
        services: salon.services.map((service) => ({ ...service, price: Number(service.price) || 0 })),
        specialists: salon.specialists.map((specialist) => ({
          ...specialist,
          name: specialist.user?.fullName || 'متخصص زیبایی',
          phone: specialist.user?.phone || '',
          role: 'متخصص زیبایی',
          specialistType: specialist.user?.role,
          verified: specialist.isVerified,
          isMobileSpecialist: specialist.isMobileActive,
          avatar: specialist.avatarUrl,
          user: specialist.user ? { id: specialist.user.id, fullName: specialist.user.fullName, phone: specialist.user.phone, role: specialist.user.role, status: specialist.user.status } : null,
        })),
      })));
    } catch (err) {
      console.error('[API MANAGED SALONS ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت اطلاعات مدیریتی سالن.' });
    }
  });

  app.get('/api/salons', async (_req, res) => {
    try {
      const list = await db.query.salons.findMany({
        where: eq(salons.isApproved, true),
        with: {
          services: true,
          specialists: { with: { user: true, portfolio: true } },
        },
      });
      res.json(list.map((salon) => ({
        id: salon.id, name: salon.name, address: salon.address, province: salon.province,
        city: salon.city, district: salon.district, latitude: salon.latitude, longitude: salon.longitude,
        rating: Number(salon.rating) || 5, reviewsCount: salon.reviewsCount,
        isVip: salon.isVip, vipBadgeLabel: salon.vipBadgeLabel, isMobileServiceActive: salon.isMobileServiceActive,
        coverImage: salon.coverImage,
        gallery: salon.gallery ? (salon.gallery.startsWith('[') ? JSON.parse(salon.gallery) : [salon.gallery]) : (salon.coverImage ? [salon.coverImage] : []),
        services: salon.services.filter(s => s.publicationStatus === 'active').map(s => ({
          id: s.id, salonId: s.salonId, serviceLineId: s.serviceLineId, name: s.name,
          description: s.description, price: Number(s.price) || 0, durationMinutes: s.durationMinutes,
          isMobileAvailable: s.isMobileAvailable, imageUrl: s.imageUrl,
        })),
        specialists: salon.specialists.filter(sp => sp.isVerified && sp.publicationStatus === 'active' && sp.user?.status === 'active').map(sp => ({
          id: sp.id, salonId: sp.salonId, specialtyLine: sp.specialtyLine, bio: sp.bio,
          experienceYears: sp.experienceYears, avatarUrl: sp.avatarUrl,
          name: sp.user?.fullName || 'متخصص زیبایی',
          portfolio: sp.portfolio.map(item => ({ id: item.id, title: item.title, imageUrl: item.imageUrl, category: item.category })),
        })),
      })));
    } catch (err) {
      console.error('[API SALONS ERROR]', err);
      res.status(500).json({ error: 'خطا در دریافت لیست.' });
    }
  });

  app.patch('/api/salons/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const data = schemas.salonUpdateSchema.parse(req.body);
      const target = await db.select().from(salons).where(eq(salons.id, id)).limit(1).then(r => r[0]);
      if (!target) return res.status(404).json({ error: 'یافت نشد.' });

      if (req.dbUser.role === 'salon_admin' && Number(req.dbUser.salonId) !== target.id) return res.status(403).json({ error: 'عدم دسترسی.' });

      if (req.dbUser.role !== 'super_admin' && (data.isApproved !== undefined || data.isVip !== undefined || data.vipBadgeLabel !== undefined)) return res.status(403).json({ error: 'تغییر تایید یا نشان VIP فقط توسط مدیر کل مجاز است.' });

      const patchData: Record<string, any> = { ...data };
      if (req.dbUser.role !== 'super_admin') {
        delete patchData.isApproved;
        delete patchData.isVip;
        delete patchData.vipBadgeLabel;
      }
      if (Array.isArray(patchData.gallery)) {
        patchData.gallery = JSON.stringify(patchData.gallery);
      }

      const [updated] = await db.update(salons).set(patchData).where(eq(salons.id, id)).returning();
      res.json({ success: true, salon: updated });
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش.' });
    }
  });

  app.post('/api/salons', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const data = schemas.salonCreateSchema.parse(req.body);
      const tenantId = `tenant-${crypto.randomInt(1000, 9999)}-${Date.now().toString().slice(-4)}`;
      
      const [newSalon] = await db.insert(salons).values({
        ...data,
        phone: normalizePhone(data.phone),
        tenantId,
        district: data.district || '',
        isApproved: false,
      }).returning();

      res.status(201).json({
        ...newSalon,
        phone: newSalon.phone || '',
        rating: Number(newSalon.rating) || 5,
        reviewsCount: Number(newSalon.reviewsCount) || 0,
        gallery: newSalon.gallery
          ? (typeof newSalon.gallery === 'string'
              ? (newSalon.gallery.startsWith('[') ? JSON.parse(newSalon.gallery) : [newSalon.gallery])
              : newSalon.gallery)
          : (newSalon.coverImage ? [newSalon.coverImage] : []),
        services: [],
        specialists: [],
      });
    } catch (err: any) {
      console.error('[POST SALONS ERROR]', err);
      if (err instanceof ZodError) {
        return res.status(400).json({ error: err.issues[0]?.message || 'اطلاعات سالن نامعتبر است.' });
      }
      res.status(500).json({ error: err.message || 'خطا در ایجاد سالن در دیتابیس.' });
    }
  });

  app.delete('/api/salons/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(salons).where(eq(salons.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف سالن.' });
    }
  });

  // --- Services CRUD (Optimized with direct SQL filtering) ---
  app.get('/api/services', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = req.dbUser.role === 'super_admin'
        ? await db.select().from(services)
        : await db.select().from(services).where(eq(services.salonId, Number(req.dbUser.salonId)));
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت خدمات.' });
    }
  });
  app.post('/api/services', requireAuth, requireRole(['super_admin', 'salon_admin', 'salon_specialist', 'mobile_specialist']), async (req: AuthRequest, res) => {
    try {
      const { salonId, serviceLineId, name, description, price, durationMinutes, isMobileAvailable, imageUrl } = req.body;
      const ownerSalonId = req.dbUser.role === 'super_admin' ? Number(salonId) : Number(req.dbUser.salonId);
      if (!ownerSalonId || (req.dbUser.role !== 'super_admin' && salonId !== undefined && Number(salonId) !== ownerSalonId)) return res.status(403).json({ error: 'عدم دسترسی به tenant.' });
      if (['salon_specialist', 'mobile_specialist'].includes(req.dbUser.role)) {
        const specialist = await db.select().from(specialists).where(eq(specialists.userId, req.dbUser.id)).limit(1).then(r => r[0]);
        if (!specialist || specialist.salonId !== ownerSalonId || specialist.specialtyLine !== serviceLineId) return res.status(403).json({ error: 'متخصص فقط می‌تواند خدمت مرتبط با سالن و لاین تخصصی خود پیشنهاد دهد.' });
      }
      if (typeof name !== 'string' || !name.trim() || !serviceLineId || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(durationMinutes)) || Number(durationMinutes) < 1) return res.status(400).json({ error: 'اطلاعات خدمت نامعتبر است.' });
      const [row] = await db.insert(services).values({ salonId: ownerSalonId, serviceLineId, name: name.trim(), description: typeof description === 'string' ? description : null, price: String(price), durationMinutes: Number(durationMinutes), isMobileAvailable: !!isMobileAvailable, imageUrl, publicationStatus: 'pending' }).returning();
      res.status(201).json(row);
    } catch { res.status(400).json({ error: 'اطلاعات خدمت نامعتبر است.' }); }
  });
  app.patch('/api/services/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    const id = Number(req.params.id), row = await db.select().from(services).where(eq(services.id, id)).limit(1).then(r => r[0]);
    if (!row) return res.status(404).json({ error: 'یافت نشد.' });
    if (req.dbUser.role !== 'super_admin' && row.salonId !== req.dbUser.salonId) return res.status(403).json({ error: 'عدم دسترسی.' });
    const { salonId, publicationStatus, ...data } = req.body;
    if (salonId !== undefined && Number(salonId) !== row.salonId) return res.status(403).json({ error: 'تغییر tenant مجاز نیست.' });
    const [updated] = await db.update(services).set({ ...data, ...(req.dbUser.role === 'super_admin' && publicationStatus ? { publicationStatus } : {}) }).where(eq(services.id, id)).returning();
    res.json(updated);
  });
  app.delete('/api/services/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    const id = Number(req.params.id), row = await db.select().from(services).where(eq(services.id, id)).limit(1).then(r => r[0]);
    if (!row) return res.status(404).json({ error: 'یافت نشد.' });
    if (req.dbUser.role !== 'super_admin' && row.salonId !== req.dbUser.salonId) return res.status(403).json({ error: 'عدم دسترسی.' });
    await db.delete(services).where(eq(services.id, id)); res.json({ success: true });
  });

  // --- Specialists CRUD (Optimized with direct SQL filtering) ---
  app.get('/api/specialists', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rows = req.dbUser.role === 'super_admin'
        ? await db.select().from(specialists)
        : await db.select().from(specialists).where(eq(specialists.salonId, Number(req.dbUser.salonId)));
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت متخصصین.' });
    }
  });
  app.post('/api/specialists', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const { userId, salonId, specialtyLine, bio, experienceYears, isMobileActive, avatarUrl } = req.body;
      const ownerSalonId = req.dbUser.role === 'super_admin' ? Number(salonId) : Number(req.dbUser.salonId);
      if (!ownerSalonId || (req.dbUser.role !== 'super_admin' && salonId !== undefined && Number(salonId) !== ownerSalonId)) return res.status(403).json({ error: 'عدم دسترسی به tenant.' });
      const user = await db.select().from(users).where(eq(users.id, Number(userId))).limit(1).then(r => r[0]);
      if (!user || user.salonId !== ownerSalonId || !['salon_specialist','mobile_specialist'].includes(user.role)) return res.status(400).json({ error: 'حساب متخصص معتبر نیست.' });
      const [row] = await db.insert(specialists).values({ userId: Number(userId), salonId: ownerSalonId, specialtyLine, bio, experienceYears: Number(experienceYears || 0), isMobileActive: !!isMobileActive, avatarUrl, isVerified: false, publicationStatus: 'pending' }).returning();
      res.status(201).json(row);
    } catch { res.status(400).json({ error: 'اطلاعات متخصص نامعتبر است.' }); }
  });
  app.patch('/api/specialists/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    const id = Number(req.params.id), row = await db.select().from(specialists).where(eq(specialists.id, id)).limit(1).then(r => r[0]);
    if (!row) return res.status(404).json({ error: 'یافت نشد.' });
    if (req.dbUser.role !== 'super_admin' && row.salonId !== req.dbUser.salonId) return res.status(403).json({ error: 'عدم دسترسی.' });
    const { salonId, isVerified, publicationStatus, userId, ...data } = req.body;
    if (salonId !== undefined && Number(salonId) !== row.salonId || userId !== undefined && Number(userId) !== row.userId) return res.status(403).json({ error: 'تغییر مالکیت مجاز نیست.' });
    const approval = req.dbUser.role === 'super_admin' ? { ...(isVerified !== undefined ? { isVerified: !!isVerified } : {}), ...(publicationStatus ? { publicationStatus } : {}) } : {};
    const [updated] = await db.update(specialists).set({ ...data, ...approval }).where(eq(specialists.id, id)).returning(); res.json(updated);
  });
  app.delete('/api/specialists/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    const id = Number(req.params.id), row = await db.select().from(specialists).where(eq(specialists.id, id)).limit(1).then(r => r[0]);
    if (!row) return res.status(404).json({ error: 'یافت نشد.' });
    if (req.dbUser.role !== 'super_admin' && row.salonId !== req.dbUser.salonId) return res.status(403).json({ error: 'عدم دسترسی.' });
    await db.delete(specialists).where(eq(specialists.id, id)); res.json({ success: true });
  });

  // --- Users (Optimized with direct SQL filtering) ---

  app.get('/api/users', requireAuth, requireRole(['super_admin', 'salon_admin', 'line_manager']), async (req: AuthRequest, res) => {
    try {
      const userList = req.dbUser.role === 'super_admin'
        ? await db.select().from(users).orderBy(desc(users.createdAt))
        : await db.select().from(users).where(eq(users.salonId, Number(req.dbUser.salonId))).orderBy(desc(users.createdAt));

      // P2-08: Redact PII consistently
      const processed = userList.map(u => redactUserPII(u, req.dbUser));

      res.json(processed);
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت کاربران.' });
    }
  });


  app.post('/api/users', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const data = schemas.userCreateSchema.parse(req.body);
      const isSuper = req.dbUser.role === 'super_admin';
      if (!isSuper && (data.role !== 'customer' && data.role !== 'salon_specialist' && data.role !== 'mobile_specialist')) return res.status(403).json({ error: 'ایجاد این نقش مجاز نیست.' });
      if (!isSuper && (!req.dbUser.salonId || (data.salonId !== undefined && Number(data.salonId) !== req.dbUser.salonId))) return res.status(403).json({ error: 'عدم دسترسی به tenant.' });
      
      // Check if user already exists by phone
      const existing = await db.select().from(users).where(eq(users.phone, data.phone)).limit(1).then(r => r[0]);
      if (existing) return res.status(400).json({ error: 'کاربری با این شماره همراه قبلاً ثبت شده است.' });

      const [newUser] = await db.insert(users).values({
        uid: `admin_${Date.now()}_${data.phone}`,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || `${data.phone}@boya.ir`,
        role: isSuper ? data.role as any : (data.role || 'customer') as any,
        salonId: isSuper ? (data.salonId ? Number(data.salonId) : null) : req.dbUser.salonId,
        status: 'active',
      }).returning();

      await logSecurityAction({ actorId: req.dbUser.id, targetId: newUser.id, action: 'CREATE_USER', details: { role: newUser.role }, ipAddress: req.ip });

      res.status(201).json(newUser);
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در تعریف کاربر.' });
    }
  });

  app.delete('/api/users/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const target = await db.select().from(users).where(eq(users.id, id)).limit(1).then(r => r[0]);
      if (!target) return res.status(404).json({ error: 'یافت نشد.' });

      await db.delete(users).where(eq(users.id, id));
      await logSecurityAction({ actorId: req.dbUser.id, targetId: id, action: 'DELETE_USER', details: { name: target.fullName }, ipAddress: req.ip });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف کاربر.' });
    }
  });

  // P2-12: Specific endpoint for Line Managers
  app.get('/api/line-manager/staff', requireAuth, requireRole(['line_manager']), async (req: AuthRequest, res) => {
    try {
      const { salonId, managedLine } = req.dbUser;
      if (!salonId || !managedLine) return res.status(403).json({ error: 'اطلاعات مدیریتی شما ناقص است.' });

      const staffList = await db.select().from(users).where(and(
        eq(users.salonId, salonId),
        eq(users.managedLine, managedLine)
      ));

      res.json(staffList.map(u => redactUserPII(u, req.dbUser)));
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت لیست پرسنل.' });
    }
  });

  app.patch('/api/users/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const rawBody = req.body || {};
      if (rawBody.name && !rawBody.fullName) {
        rawBody.fullName = rawBody.name;
      }
      const validColumns = ['fullName', 'role', 'salonId', 'email', 'status', 'avatar', 'managedLine'];
      const sanitizedPatch: Record<string, any> = {};
      for (const key of validColumns) {
        if (rawBody[key] !== undefined) {
          sanitizedPatch[key] = rawBody[key];
        }
      }
      const patch = schemas.userUpdateSchema.parse(sanitizedPatch);
      const target = await db.select().from(users).where(eq(users.id, id)).limit(1).then(r => r[0]);
      if (!target) return res.status(404).json({ error: 'یافت نشد.' });

      const isSuper = req.dbUser.role === 'super_admin';
      const isSalonAdmin = req.dbUser.role === 'salon_admin' && req.dbUser.salonId === target.salonId;
      if (req.dbUser.id !== target.id && !isSuper && !isSalonAdmin) return res.status(403).json({ error: 'عدم دسترسی.' });

      const oldRole = target.role;
      const oldStatus = target.status;

      if (!isSuper) {
        delete (patch as any).role;
        delete (patch as any).status;
        delete (patch as any).salonId;
        delete (patch as any).managedLine;
      }
      if (req.dbUser.id === target.id && !isSuper) {
        delete (patch as any).role; delete (patch as any).status; delete (patch as any).salonId;
      }

      const [updated] = await db.update(users).set(patch as any).where(eq(users.id, id)).returning();

      if (patch.role && patch.role !== oldRole) await logSecurityAction({ actorId: req.dbUser.id, targetId: id, action: 'ROLE_CHANGE', details: { from: oldRole, to: patch.role }, ipAddress: req.ip });
      if (patch.status && patch.status !== oldStatus) await logSecurityAction({ actorId: req.dbUser.id, targetId: id, action: 'SUSPENSION', details: { from: oldStatus, to: patch.status }, ipAddress: req.ip });

      res.json({ success: true, user: updated });
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش.' });
    }
  });

  // --- Bookings ---

  app.post('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = schemas.bookingCreateSchema.parse(req.body);
      
      const salonId = Number(data.salonId), serviceId = Number(data.serviceId), specialistId = Number(data.specialistId);
      const salon = await db.select().from(salons).where(eq(salons.id, salonId)).limit(1).then(r => r[0]);
      const service = await db.select().from(services).where(eq(services.id, serviceId)).limit(1).then(r => r[0]);
      const specialist = await db.select().from(specialists).where(eq(specialists.id, specialistId)).limit(1).then(r => r[0]);
      const specialistUser = specialist ? await db.select().from(users).where(eq(users.id, specialist.userId)).limit(1).then(r => r[0]) : null;
      if (!salon || !salon.isApproved || !service || service.salonId !== salonId || service.publicationStatus !== 'active' || !specialist || specialist.salonId !== salonId || !specialist.isVerified || specialist.publicationStatus !== 'active' || specialistUser?.status !== 'active') return res.status(400).json({ error: 'سالن، خدمت یا متخصص برای رزرو منتشر/تایید نشده است.' });
      if (data.isMobileBooking) {
        if (!salon.isMobileServiceActive || !service.isMobileAvailable || !specialist.isMobileActive) {
          return res.status(400).json({ error: 'رزرو سیار برای این ترکیب فعال نیست.' });
        }
        if (!data.customerAddress || !data.customerAddress.trim()) {
          return res.status(400).json({ error: 'وارد کردن آدرس دقیق برای خدمات در محل الزامی است.' });
        }
      }

      // Check for double booking race condition explicitly before insert
      const existingSlot = await db.select().from(bookingsTable).where(and(
        eq(bookingsTable.specialistId, Number(data.specialistId)),
        eq(bookingsTable.date, normalizeToIsoDate(data.date)),
        eq(bookingsTable.time, normalizeTime(data.time))
      )).limit(1).then(r => r[0]);

      if (existingSlot && existingSlot.status !== 'cancelled') {
        return res.status(409).json({ error: 'این سانس قبلاً توسط مراجع دیگری رزرو شده است. لطفاً زمان یا متخصص دیگری را انتخاب کنید.' });
      }

      // Enforce canonical service price from DB
      const canonicalPrice = String(service.price);

      const booking = await createBooking({ ...data, price: canonicalPrice, customerId: req.dbUser.id });
      await sendMeliPayamakSms(req.dbUser.phone, `نوبت ثبت شد. کد رهگیری: ${booking?.trackingCode}`).catch(() => {});
      res.status(201).json(booking);
    } catch (err: any) {
      if (err.code === '23505' || String(err.message).includes('unique_specialist_slot')) {
        return res.status(409).json({ error: 'این سانس توسط کاربر دیگری در لحظه قبل رزرو شد (تضاد سانس).' });
      }
      const msg = err.message || 'خطا در ثبت نوبت.';
      res.status(msg.includes('NOT_FOUND') ? 404 : 400).json({ error: msg });
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

  app.patch('/api/bookings/:id/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;
      const booking = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id)).limit(1).then(r => r[0]);
      if (!booking) return res.status(404).json({ error: 'نوبت یافت نشد.' });

      const isSuper = req.dbUser.role === 'super_admin';
      const isSalonAdmin = req.dbUser.role === 'salon_admin' && Number(req.dbUser.salonId) === booking.salonId;
      const isCustomer = req.dbUser.id === booking.customerId && status === 'cancelled';
      const isSpecialist = ['salon_specialist', 'mobile_specialist'].includes(req.dbUser.role);
      
      let specialistMatches = false;
      if (isSpecialist) {
        const spec = await db.select().from(specialists).where(eq(specialists.userId, req.dbUser.id)).limit(1).then(r => r[0]);
        if (spec && spec.id === booking.specialistId) specialistMatches = true;
      }

      if (!isSuper && !isSalonAdmin && !isCustomer && !specialistMatches) {
        return res.status(403).json({ error: 'عدم دسترسی به تغییر وضعیت این نوبت.' });
      }

      const updated = await updateBookingStatus(id, status);
      res.json(updated);
    } catch (err: any) {
      console.error('[BOOKING STATUS PATCH ERROR]', err);
      res.status(500).json({ error: err.message || 'خطا در به‌روزرسانی وضعیت نوبت.' });
    }
  });

  // --- Admin Data ---

  app.get('/api/admin/profile', requireAuth, requireRole(['super_admin']), async (req, res) => {
    res.json(await db.select().from(adminProfile).limit(1).then(r => r[0]));
  });

  app.patch('/api/admin/profile', requireAuth, requireRole(['super_admin']), async (req, res) => {
    try {
      const data = schemas.adminProfileUpdateSchema.parse(req.body);
      const profile = await db.select().from(adminProfile).limit(1).then(r => r[0]);
      if (!profile) {
        const [newP] = await db.insert(adminProfile).values({
          fullName: data.fullName || 'مدیر ارشد',
          phone: data.phone || '09120000000',
          email: data.email || 'admin@boya.ir',
          ...data
        }).returning();
        return res.json(newP);
      }
      const [updated] = await db.update(adminProfile).set(data).where(eq(adminProfile.id, profile.id)).returning();
      res.json(updated);
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'اطلاعات پروفایل مدیریت نامعتبر است.' });
    }
  });

  app.get('/api/notifications', async (req, res) => {
    res.json(await db.select().from(notifications).where(eq(notifications.isActive, true)).orderBy(desc(notifications.createdAt)));
  });

  app.post('/api/notifications', requireAuth, requireRole(['super_admin']), async (req, res) => {
    try {
      const data = schemas.notificationCreateSchema.parse(req.body);
      const [n] = await db.insert(notifications).values(data).returning();
      res.status(201).json(n);
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'اطلاعات اعلان نامعتبر است.' });
    }
  });

  app.delete('/api/notifications/:id', requireAuth, requireRole(['super_admin']), async (req, res) => {
    await db.delete(notifications).where(eq(notifications.id, Number(req.params.id)));
    res.json({ success: true });
  });

  app.post('/api/notifications/broadcast', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const { title, content, targetAudience } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: 'عنوان و متن پیام الزامی است.' });
      }

      // Fetch target users to broadcast SMS via Melipayamak
      let targetUsers = await db.select().from(users);
      if (targetAudience === 'customer') {
        targetUsers = targetUsers.filter(u => u.role === 'customer');
      } else if (targetAudience === 'salon') {
        targetUsers = targetUsers.filter(u => ['salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager'].includes(u.role));
      }

      let sentCount = 0;
      for (const u of targetUsers) {
        if (u.phone) {
          try {
            await sendMeliPayamakSms(u.phone, `${title}\n${content}`);
            sentCount++;
          } catch (smsErr) {
            console.error(`[BROADCAST SMS FAIL] To ${u.phone}:`, smsErr);
          }
        }
      }

      // Also create an in-app notification record
      const [newNotif] = await db.insert(notifications).values({
        title: String(title).trim(),
        content: String(content).trim(),
        type: 'promotional',
        targetAudience: targetAudience || 'all',
        channel: 'sms',
        isActive: true,
        smsSentCount: sentCount,
      }).returning();

      res.status(201).json({ success: true, sentCount, notification: newNotif });
    } catch (err: any) {
      console.error('[BROADCAST ERROR]', err);
      res.status(500).json({ error: err?.message || 'خطا در ارسال پیامک انبوه.' });
    }
  });

  // --- Audit Logs Endpoint ---
  app.get('/api/audit-logs', requireAuth, requireRole(['super_admin']), async (req, res) => {
    try {
      const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت لاگ‌های امنیتی.' });
    }
  });

  // --- Reviews Endpoint ---
  app.post('/api/salons/:id/reviews', requireAuth, async (req: AuthRequest, res) => {
    try {
      const salonId = Number(req.params.id);
      const { rating } = req.body;
      if (!Number.isFinite(salonId) || !rating) {
        return res.status(400).json({ error: 'اطلاعات نظر نامعتبر است.' });
      }

      const salon = await db.select().from(salons).where(eq(salons.id, salonId)).limit(1).then(r => r[0]);
      if (salon) {
        const newCount = (salon.reviewsCount || 0) + 1;
        const currentRating = Number(salon.rating) || 5;
        const newRating = Number(((currentRating * (newCount - 1) + Number(rating)) / newCount).toFixed(1));
        await db.update(salons).set({ reviewsCount: newCount, rating: String(newRating) }).where(eq(salons.id, salonId));
      }

      res.status(201).json({ success: true, message: 'نظر شما با موفقیت ثبت گردید.' });
    } catch (err) {
      res.status(500).json({ error: 'خطا در ثبت نظر.' });
    }
  });

  // --- Support Tickets Endpoints ---
  app.get('/api/tickets', requireAuth, async (req: AuthRequest, res) => {
    try {
      let ticketsList;
      if (req.dbUser.role === 'super_admin') {
        ticketsList = await db.select().from(supportTickets).orderBy(desc(supportTickets.updatedAt));
      } else {
        ticketsList = await db.select().from(supportTickets).where(eq(supportTickets.userId, req.dbUser.id)).orderBy(desc(supportTickets.updatedAt));
      }

      const ticketsWithMessages = await Promise.all(
        ticketsList.map(async (t) => {
          const msgs = await db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, t.id)).orderBy(ticketMessages.createdAt);
          return { ...t, messages: msgs };
        })
      );

      res.json(ticketsWithMessages);
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت تیکت‌های پشتیبانی.' });
    }
  });

  app.post('/api/tickets', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { subject, category, priority, message } = req.body;
      if (!subject || !message) {
        return res.status(400).json({ error: 'موضوع و متن پیام الزامی است.' });
      }

      const randomSuffix = crypto.randomInt(1000, 9999);
      const ticketCode = `TK-${randomSuffix}`;

      const [newTicket] = await db.insert(supportTickets).values({
        userId: req.dbUser.id,
        ticketCode,
        subject: String(subject).trim(),
        category: category || 'general',
        priority: priority || 'medium',
        status: 'open',
      }).returning();

      const [firstMessage] = await db.insert(ticketMessages).values({
        ticketId: newTicket.id,
        senderId: req.dbUser.id,
        senderRole: req.dbUser.role,
        message: String(message).trim(),
      }).returning();

      res.status(201).json({ ...newTicket, messages: [firstMessage] });
    } catch (err) {
      res.status(500).json({ error: 'خطا در ایجاد تیکت پشتیبانی.' });
    }
  });

  app.post('/api/tickets/:id/messages', requireAuth, async (req: AuthRequest, res) => {
    try {
      const ticketId = Number(req.params.id);
      const { message } = req.body;
      if (!message || !Number.isFinite(ticketId)) {
        return res.status(400).json({ error: 'متن پیام الزامی است.' });
      }

      const ticket = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1).then(r => r[0]);
      if (!ticket) return res.status(404).json({ error: 'تیکت یافت نشد.' });
      if (req.dbUser.role !== 'super_admin' && ticket.userId !== req.dbUser.id) {
        return res.status(403).json({ error: 'عدم دسترسی به تیکت.' });
      }

      const [msgRecord] = await db.insert(ticketMessages).values({
        ticketId,
        senderId: req.dbUser.id,
        senderRole: req.dbUser.role,
        message: String(message).trim(),
      }).returning();

      await db.update(supportTickets).set({ updatedAt: new Date(), status: req.dbUser.role === 'super_admin' ? 'in_progress' : 'open' }).where(eq(supportTickets.id, ticketId));

      res.status(201).json(msgRecord);
    } catch (err) {
      res.status(500).json({ error: 'خطا در ارسال پیام.' });
    }
  });

  app.patch('/api/tickets/:id/status', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
    try {
      const ticketId = Number(req.params.id);
      const { status } = req.body;
      if (!status || !Number.isFinite(ticketId)) {
        return res.status(400).json({ error: 'وضعیت نامعتبر است.' });
      }

      const [updated] = await db.update(supportTickets).set({ status, updatedAt: new Date() }).where(eq(supportTickets.id, ticketId)).returning();
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'خطا در به‌روزرسانی وضعیت تیکت.' });
    }
  });

  // --- Static ---

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

  // Global Error Handler
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
