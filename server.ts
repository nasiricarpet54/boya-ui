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
import { createProxyMiddleware } from 'http-proxy-middleware';
import { requireAuth, requireRole, type AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users, salons, bookings as bookingsTable, revokedTokens, notifications, adminProfile, specialists, portfolioItems } from './src/db/schema.ts';
import { eq, desc, and, sql } from 'drizzle-orm';
import { createBooking, getBookingsForUser, updateBookingStatus } from './src/db/bookings.ts';
import { sendMeliPayamakSms } from './src/lib/meliPayamak.ts';
import { normalizeToIsoDate } from './src/shared/utils/dateIsoConverter.ts';
import { normalizePhone } from './src/shared/utils/persianUtils.ts';
import { generateJwtToken } from './src/lib/jwt.ts';
import { seedDatabase } from './src/db/seed.ts';
import { logSecurityAction } from './src/db/audit.ts';
import * as schemas from './src/lib/validation.ts';
import { redactUserPII } from './src/lib/piiRedactor.ts';

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

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased for stability
  standardHeaders: true,
  legacyHeaders: false,
  store: redisClient ? new RedisStore({ 
    // @ts-ignore
    sendCommand: (...args: string[]) => redisClient!.call(...args) 
  }) : undefined,
  message: { error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.' }
});

const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();
const sendOtpRateLimit = new Map<string, { count: number; resetAt: number }>();

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
  app.use('/api/', apiLimiter);

  // Synchronous database seeding on startup
  try {
    await seedDatabase();
    console.log('[DB BOOT] Database tables and seed data synchronized successfully.');
  } catch (err) {
    console.error('[DB BOOT CRITICAL ERROR]', err);
  }

  // Support both /app/uploads (Docker volume) and public/uploads
  const dockerUploads = '/app/uploads';
  const localUploads = path.resolve(process.cwd(), 'public/uploads');
  const uploadsDir = fs.existsSync(dockerUploads) ? dockerUploads : localUploads;
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(localUploads)) fs.mkdirSync(localUploads, { recursive: true });
  
  app.use('/uploads', express.static(uploadsDir));
  app.use('/uploads', express.static(localUploads));

  // File & Image Upload endpoint (permanent disk storage)
  app.post('/api/upload', requireAuth, async (req: AuthRequest, res) => {
    try {
      const rawData = req.body.fileData || req.body.base64;
      if (!rawData || typeof rawData !== 'string') {
        return res.status(400).json({ error: 'داده تصویر ارسال نشده است.' });
      }

      const matches = rawData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      let ext = 'webp';
      let buffer: Buffer;

      if (matches) {
        ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(rawData, 'base64');
      }

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
    } catch (err) {
      console.error('[UPLOAD ERROR]', err);
      res.status(500).json({ error: 'خطا در ذخیره‌سازی فایل تصویر.' });
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

      if (!isProd) console.log(`📲 [OTP LOG] ${phone} -> ${otpCode}`);

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
      
      const { email, phone: p, ...safeUser } = dbUser;
      res.json({ user: safeUser });
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطای احراز هویت.' });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    const token = req.cookies.token;
    if (token) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      await db.insert(revokedTokens).values({ token, expiresAt: expiry }).onConflictDoNothing().catch(() => {});
      const jwtPayload = (req as any).dbUser;
      if (jwtPayload) await logSecurityAction({ actorId: jwtPayload.id, action: 'LOGOUT', ipAddress: req.ip });
    }
    res.clearCookie('token', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' });
    res.json({ success: true });
  });

  app.get('/api/profile', requireAuth, (req: AuthRequest, res) => res.json(req.dbUser));

  app.patch('/api/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const allowed = schemas.userUpdateSchema.pick({ fullName: true, avatar: true, email: true }).parse(req.body);
      const updateData: any = {};
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

      // Find specialist record for this user or by ID if provided
      let spec = await db.select().from(specialists).where(eq(specialists.userId, req.dbUser.id)).limit(1).then(r => r[0]);
      if (!spec && specialistId) {
        spec = await db.select().from(specialists).where(eq(specialists.id, Number(specialistId))).limit(1).then(r => r[0]);
      }
      if (!spec) {
        // If specialist record does not exist yet (e.g. mobile specialist), create one!
        const [newSpec] = await db.insert(specialists).values({
          userId: req.dbUser.id,
          salonId: req.dbUser.salonId || 1,
          specialtyLine: req.dbUser.managedLine || 'hair',
          bio: 'متخصص در سامانه بویا',
          experienceYears: 3,
          isVerified: true,
          isMobileActive: req.dbUser.role === 'mobile_specialist',
          avatarUrl: req.dbUser.avatar || null,
        }).returning();
        spec = newSpec;
      }

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

  app.get('/api/salons', async (req, res) => {
    try {
      const list = await db.query.salons.findMany({
        with: {
          services: true,
          specialists: {
            with: {
              user: true,
              portfolio: true,
            },
          },
        },
      });
      res.json(list.map(({ phone, ...rest }) => ({
        ...rest,
        rating: Number(rest.rating) || 5,
        reviewsCount: Number(rest.reviewsCount) || 0,
        gallery: rest.gallery
          ? (typeof rest.gallery === 'string'
              ? (rest.gallery.startsWith('[') ? JSON.parse(rest.gallery) : [rest.gallery])
              : rest.gallery)
          : (rest.coverImage ? [rest.coverImage] : []),
        services: (rest.services || []).map(srv => ({
          ...srv,
          price: Number(srv.price) || 0,
        })),
        specialists: (rest.specialists || []).map(sp => ({
          ...sp,
          name: sp.user?.fullName || 'متخصص زیبایی',
          phone: sp.user?.phone || '',
          rating: 5,
          reviewsCount: 1,
          user: sp.user ? redactUserPII(sp.user, (req as any).dbUser || { role: 'guest' }) : null,
          portfolio: sp.portfolio || [],
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

      const patchData: any = { ...data };
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
        tenantId,
        district: data.district || '',
        isApproved: true,
      }).returning();

      res.status(201).json(newSalon);
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ایجاد سالن.' });
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

  // --- Users ---

  app.get('/api/users', requireAuth, requireRole(['super_admin', 'salon_admin', 'line_manager']), async (req: AuthRequest, res) => {
    try {
      let userList = await db.select().from(users).orderBy(desc(users.createdAt));
      if (req.dbUser.role !== 'super_admin') {
        userList = userList.filter(u => u.salonId === req.dbUser.salonId);
      }

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
      
      // Check if user already exists by phone
      const existing = await db.select().from(users).where(eq(users.phone, data.phone)).limit(1).then(r => r[0]);
      if (existing) return res.status(400).json({ error: 'کاربری با این شماره همراه قبلاً ثبت شده است.' });

      const [newUser] = await db.insert(users).values({
        uid: `admin_${Date.now()}_${data.phone}`,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || `${data.phone}@boya.ir`,
        role: data.role as any,
        salonId: data.salonId ? Number(data.salonId) : null,
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
      const patch = schemas.userUpdateSchema.parse(req.body);
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
        if (!isSalonAdmin) delete (patch as any).managedLine;
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
      
      // Check for double booking race condition explicitly before insert
      const existingSlot = await db.select().from(bookingsTable).where(and(
        eq(bookingsTable.specialistId, Number(data.specialistId)),
        eq(bookingsTable.date, normalizeToIsoDate(data.date)),
        eq(bookingsTable.time, data.time)
      )).limit(1).then(r => r[0]);

      if (existingSlot && existingSlot.status !== 'cancelled') {
        return res.status(409).json({ error: 'این سانس قبلاً توسط مراجع دیگری رزرو شده است. لطفاً زمان یا متخصص دیگری را انتخاب کنید.' });
      }

      const booking = await createBooking({ ...data, customerId: req.dbUser.id });
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
      res.json(await getBookingsForUser(req.dbUser));
    } catch (err: any) {
      res.status(err.message === 'FORBIDDEN_NO_SALON' ? 403 : 500).json({ error: 'خطا در دریافت نوبت‌ها.' });
    }
  });

  // --- Admin Data ---

  app.get('/api/admin/profile', requireAuth, requireRole(['super_admin']), async (req, res) => {
    res.json(await db.select().from(adminProfile).limit(1).then(r => r[0]));
  });

  app.patch('/api/admin/profile', requireAuth, requireRole(['super_admin']), async (req, res) => {
    const profile = await db.select().from(adminProfile).limit(1).then(r => r[0]);
    if (!profile) {
      const [newP] = await db.insert(adminProfile).values(req.body).returning();
      return res.json(newP);
    }
    const [updated] = await db.update(adminProfile).set(req.body).where(eq(adminProfile.id, profile.id)).returning();
    res.json(updated);
  });

  app.get('/api/notifications', async (req, res) => {
    res.json(await db.select().from(notifications).where(eq(notifications.isActive, true)).orderBy(desc(notifications.createdAt)));
  });

  app.post('/api/notifications', requireAuth, requireRole(['super_admin']), async (req, res) => {
    const [n] = await db.insert(notifications).values(req.body).returning();
    res.status(201).json(n);
  });

  app.delete('/api/notifications/:id', requireAuth, requireRole(['super_admin']), async (req, res) => {
    await db.delete(notifications).where(eq(notifications.id, Number(req.params.id)));
    res.json({ success: true });
  });

  // --- Static & Proxy ---

  app.use('/api/v1', createProxyMiddleware({ target: 'https://boya.bcshopir.ir/api/v1', changeOrigin: true, pathRewrite: { '^/api/v1': '' } }));

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
