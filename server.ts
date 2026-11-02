import express from 'express';
import cookieParser from 'cookie-parser';
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
import { users, salons, bookings as bookingsTable, revokedTokens, notifications, adminProfile } from './src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { createBooking, getBookingsForUser, updateBookingStatus } from './src/db/bookings.ts';
import { sendMeliPayamakSms } from './src/lib/meliPayamak.ts';
import { normalizePhone } from './src/shared/utils/persianUtils.ts';
import { generateJwtToken } from './src/lib/jwt.ts';
import { seedDatabase } from './src/db/seed.ts';
import { logSecurityAction } from './src/db/audit.ts';
import * as schemas from './src/lib/validation.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();
const sendOtpRateLimit = new Map<string, { count: number; resetAt: number }>();

async function createServer() {
  const app = express();
  
  // P2-09: Lower limit to prevent DoS
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));
  app.use(cookieParser());

  // P2-13: Race condition mitigation inside seedDatabase
  seedDatabase().catch((err) => console.error('[DB SEED STARTUP ERROR]', err));

  const uploadsDir = path.resolve(__dirname, 'public/uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
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

      // P2-02: Secure Random
      const otpCode = crypto.randomInt(10000, 99999).toString();
      otpStore.set(phone, { code: otpCode, expiresAt: now + 5 * 60 * 1000, attempts: 0 });

      if (!isProd) console.log(`📲 [OTP LOG] ${phone} -> ${otpCode}`);

      // P2-10: System Logging
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
        // P2-03: Invalidate after 3 attempts
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

      // P2-11: Audit Log
      await logSecurityAction({ actorId: dbUser.id, action: 'LOGIN', ipAddress: req.ip });

      const token = generateJwtToken({ id: dbUser.id, uid: dbUser.uid, phone: dbUser.phone, role: dbUser.role, salonId: dbUser.salonId ? String(dbUser.salonId) : null });

      // P2-04: httpOnly cookie, no token in JSON
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
      // P2-04: Revoke token
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

  // --- Salons ---

  app.get('/api/salons', async (req, res) => {
    try {
      const list = await db.select().from(salons);
      // P2-08: Redact salon phone for public
      res.json(list.map(({ phone, ...rest }) => rest));
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت لیست.' });
    }
  });

  app.post('/api/salons', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const data = schemas.salonUpdateSchema.parse(req.body);
      const isSuper = req.dbUser.role === 'super_admin';
      
      let tenantId = (req.body as any).tenantId;
      if (req.dbUser.role === 'salon_admin' && req.dbUser.salonId) {
        const s = await db.select().from(salons).where(eq(salons.id, Number(req.dbUser.salonId))).limit(1).then(r => r[0]);
        if (s) tenantId = s.tenantId;
      }

      const [inserted] = await db.insert(salons).values({
        tenantId: tenantId || `tnt-${crypto.randomInt(1000, 9999)}-${Date.now()}`,
        name: data.name || 'سالن جدید',
        address: data.address || 'تهران',
        phone: data.phone || '02100000000',
        province: data.province || 'تهران',
        city: data.city || 'تهران',
        district: data.district || 'مرکز',
        isApproved: isSuper,
      }).returning();
      res.status(201).json(inserted);
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ثبت.' });
    }
  });

  app.patch('/api/salons/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const data = schemas.salonUpdateSchema.parse(req.body);
      const target = await db.select().from(salons).where(eq(salons.id, id)).limit(1).then(r => r[0]);
      if (!target) return res.status(404).json({ error: 'یافت نشد.' });

      if (req.dbUser.role === 'salon_admin' && Number(req.dbUser.salonId) !== target.id) return res.status(403).json({ error: 'عدم دسترسی.' });

      const [updated] = await db.update(salons).set(data).where(eq(salons.id, id)).returning();
      res.json({ success: true, salon: updated });
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش.' });
    }
  });

  app.delete('/api/salons/:id', requireAuth, requireRole(['super_admin']), async (req, res) => {
    try {
      await db.delete(salons).where(eq(salons.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف.' });
    }
  });

  // --- Users ---

  app.get('/api/users', requireAuth, requireRole(['super_admin', 'salon_admin', 'line_manager']), async (req: AuthRequest, res) => {
    try {
      let userList = await db.select().from(users).orderBy(desc(users.createdAt));
      if (req.dbUser.role !== 'super_admin') {
        userList = userList.filter(u => u.salonId === req.dbUser.salonId);
      }

      // P2-08: Redact PII
      const processed = userList.map(u => {
        if (req.dbUser.role === 'super_admin' || (req.dbUser.role === 'salon_admin' && u.salonId === req.dbUser.salonId)) return u;
        const { email, phone, ...safe } = u;
        return safe;
      });

      res.json(processed);
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت کاربران.' });
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
        // P2-12: Allow salon admin to manage staff lines
        if (!isSalonAdmin) delete (patch as any).managedLine;
      }

      const [updated] = await db.update(users).set(patch as any).where(eq(users.id, id)).returning();

      // P2-11: Audit Logs
      if (patch.role && patch.role !== oldRole) await logSecurityAction({ actorId: req.dbUser.id, targetId: id, action: 'ROLE_CHANGE', details: { from: oldRole, to: patch.role }, ipAddress: req.ip });
      if (patch.status && patch.status !== oldStatus) await logSecurityAction({ actorId: req.dbUser.id, targetId: id, action: 'SUSPENSION', details: { from: oldStatus, to: patch.status }, ipAddress: req.ip });

      res.json({ success: true, user: updated });
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش.' });
    }
  });

  app.delete('/api/users/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const target = await db.select().from(users).where(eq(users.id, id)).limit(1).then(r => r[0]);
      if (!target) return res.status(404).json({ error: 'یافت نشد.' });

      if (req.dbUser.role === 'salon_admin' && (target.salonId !== req.dbUser.salonId || target.role === 'super_admin')) return res.status(403).json({ error: 'عدم دسترسی.' });

      await db.delete(users).where(eq(users.id, id));
      await logSecurityAction({ actorId: req.dbUser.id, targetId: id, action: 'DELETE_USER', ipAddress: req.ip });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف.' });
    }
  });

  // --- Bookings ---

  app.post('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = schemas.bookingCreateSchema.parse(req.body);
      const booking = await createBooking({ ...data, customerId: req.dbUser.id });
      await sendMeliPayamakSms(req.dbUser.phone, `نوبت ثبت شد. کد رهگیری: ${booking?.trackingCode}`).catch(() => {});
      res.status(201).json(booking);
    } catch (err: any) {
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

  app.patch('/api/bookings/:id/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const bid = Number(req.params.id);
      const { status } = schemas.bookingStatusUpdateSchema.parse(req.body);
      const target = await db.query.bookings.findFirst({ where: eq(bookingsTable.id, bid), with: { specialist: true } });
      if (!target) return res.status(404).json({ error: 'یافت نشد.' });

      const isSuper = req.dbUser.role === 'super_admin';
      const isSalon = req.dbUser.role === 'salon_admin' && req.dbUser.salonId === target.salonId;
      const isSpec = (req.dbUser.role === 'salon_specialist' || req.dbUser.role === 'mobile_specialist') && target.specialist?.userId === req.dbUser.id;
      const isCust = req.dbUser.role === 'customer' && target.customerId === req.dbUser.id;

      if (!isSuper && !isSalon && !isSpec && !isCust) return res.status(403).json({ error: 'عدم دسترسی.' });
      if (isCust && status !== 'cancelled') return res.status(403).json({ error: 'فقط لغو نوبت توسط مشتری مجاز است.' });

      res.json(await updateBookingStatus(bid, status));
    } catch (err: any) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در تغییر وضعیت.' });
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

  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} [Mode: ${isProd ? 'Production' : 'Development'}]`));
}

createServer();
