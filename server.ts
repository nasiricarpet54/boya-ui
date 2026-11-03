import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
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
      const [updated] = await db.update(users).set(allowed).where(eq(users.id, req.dbUser.id)).returning();
      if (allowed.avatar) {
        await db.update(specialists).set({ avatarUrl: allowed.avatar }).where(eq(specialists.userId, req.dbUser.id)).catch(() => {});
      }
      res.json({ success: true, user: updated });
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش پروفایل.' });
    }
  });

  app.get('/api/salons', async (_req, res) => {
    try {
      const list = await db.query.salons.findMany({
        where: eq(salons.isApproved, true),
        with: { services: true, specialists: { with: { user: true, portfolio: true } } },
      });
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت لیست.' });
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
      res.status(500).json({ error: 'خطا در دریافت لیست.' });
    }
  });

  app.patch('/api/salons/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const data = schemas.salonUpdateSchema.parse(req.body);
      const [updated] = await db.update(salons).set(data).where(eq(salons.id, id)).returning();
      res.json({ success: true, salon: updated });
    } catch (err) {
      res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش.' });
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
      const booking = await createBooking({ ...data, customerId: req.dbUser.id });
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
      let tu = await db.select().from(users);
      if (targetAudience === 'customer') tu = tu.filter(u => u.role === 'customer');
      else if (targetAudience === 'salon') tu = tu.filter(u => ['salon_admin','salon_specialist','mobile_specialist','line_manager'].includes(u.role));
      let sc = 0;
      for (const u of tu) if (u.phone) { try { await sendMeliPayamakSms(u.phone, `${title}\\n${content}`); sc++; } catch {} }
      const [n] = await db.insert(notifications).values({ title: String(title).trim(), content: String(content).trim(), type: 'promotional', targetAudience: targetAudience || 'all', channel: 'sms', isActive: true, badgeText: `${sc} پیامک` }).returning();
      res.status(201).json({ success: true, sentCount: sc, notification: n });
    } catch (e: any) { res.status(500).json({ error: e?.message || 'خطا در ارسال پیامک.' }); }
  });
  app.get('/api/tickets', requireAuth, async (req: AuthRequest, res) => {
    try {
      const list = req.dbUser.role === 'super_admin' ? await db.select().from(supportTickets).orderBy(desc(supportTickets.updatedAt)) : await db.select().from(supportTickets).where(eq(supportTickets.userId, req.dbUser.id)).orderBy(desc(supportTickets.updatedAt));
      res.json(await Promise.all(list.map(async t => ({ ...t, messages: await db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, t.id)).orderBy(ticketMessages.createdAt) }))));
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
