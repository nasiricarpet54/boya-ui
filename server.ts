import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { requireAuth, requireRole, type AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users, salons, bookings as bookingsTable, specialists } from './src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { createBooking, getBookingsForUser, updateBookingStatus } from './src/db/bookings.ts';
import { getOrCreateUserByPhone, sanitizeRole } from './src/db/users.ts';
import { sendMeliPayamakSms } from './src/lib/meliPayamak.ts';
import { loadServerData, saveServerData } from './src/lib/serverDataStore.ts';
import { normalizePhone } from './src/shared/utils/persianUtils.ts';
import { generateJwtToken } from './src/lib/jwt.ts';
import { seedDatabase } from './src/db/seed.ts';

dotenv.config();

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ SECURITY ALERT: JWT_SECRET is not defined in environment variables. The server will start with a fallback key, but this is insecure for production use.');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

// In-memory stores for transient non-DB data
const otpStore = new Map<string, { code: string; expiresAt: number }>();
const sendOtpRateLimit = new Map<string, { count: number; resetAt: number }>();
const verifyOtpRateLimit = new Map<string, { attempts: number; resetAt: number }>();

async function createServer() {
  const app = express();
  let serverData = loadServerData();
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));
  app.use(cookieParser());

  // Run database seed in background on startup
  seedDatabase().catch((err) => console.error('[DB SEED STARTUP ERROR]', err));

  const uploadsDir = path.resolve(__dirname, 'public/uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Block any direct access to sensitive data paths
  app.all(['/data/*', '/server-data/*'], (req, res) => {
    res.status(404).json({ error: 'یافت نشد.' });
  });

  // --- API Routes ---

  // Upload Compressed Image or Document File (Protected)
  app.post('/api/upload', requireAuth, (req: AuthRequest, res) => {
    try {
      const { fileData } = req.body;
      if (!fileData) {
        return res.status(400).json({ error: 'محتوای فایل دریافت نشد.' });
      }

      const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.json({ url: fileData });
      }

      const mimeType = matches[1];
      const extension = mimeType.includes('webp') ? 'webp' : mimeType.includes('pdf') ? 'pdf' : mimeType.includes('png') ? 'png' : 'jpg';

      const buffer = Buffer.from(matches[2], 'base64');
      const savedFileName = `file_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;
      const savePath = path.join(uploadsDir, savedFileName);

      fs.writeFileSync(savePath, buffer);
      console.log(`[FILE UPLOAD LOG] User: ${req.dbUser?.phone} saved file: ${savedFileName}`);

      res.json({ url: `/uploads/${savedFileName}` });
    } catch (err) {
      console.error('Upload Error:', err);
      res.status(500).json({ error: 'خطا در ذخیره‌سازی فایل روی سرور.' });
    }
  });

  // Phone OTP Auth: Send OTP with Rate Limiting
  app.post('/api/auth/send-otp', async (req, res) => {
    const phone = normalizePhone(req.body.phone);
    if (!phone || !/^09\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'شماره همراه وارد شده معتبر نمی‌باشد.' });
    }

    // Rate Limiting
    const now = Date.now();
    const sendRecord = sendOtpRateLimit.get(phone);
    if (sendRecord && now < sendRecord.resetAt) {
      if (sendRecord.count >= 3) return res.status(429).json({ error: 'درخواست‌های مکرر غیرمجاز.' });
      sendRecord.count++;
    } else {
      sendOtpRateLimit.set(phone, { count: 1, resetAt: now + 5 * 60 * 1000 });
    }

    const otpCode = Math.floor(10000 + Math.random() * 90000).toString();
    otpStore.set(phone, { code: otpCode, expiresAt: now + 5 * 60 * 1000 });

    if (!isProd) {
      console.log(`📲 [OTP LIVE BACKEND LOG] Recipient: ${phone}, Code: ${otpCode}`);
    }

    await sendMeliPayamakSms(phone, `کد ورودی یکبار مصرف پلتفرم زیبایی بویا: ${otpCode}`);
    res.json({ success: true, message: 'کد تایید ارسال گردید.' });
  });

  // Verify OTP with Brute-force protection
  app.post('/api/auth/verify-otp', async (req, res) => {
    const { phone: rawPhone, code, fullName } = req.body;
    const phone = normalizePhone(rawPhone);
    if (!phone || !code) return res.status(400).json({ error: 'شماره همراه و کد تایید الزامی است.' });

    const now = Date.now();
    const verifyRecord = verifyOtpRateLimit.get(phone);
    if (verifyRecord && now < verifyRecord.resetAt && verifyRecord.attempts >= 5) {
      return res.status(429).json({ error: 'تلاش‌های ناموفق بیش از حد مجاز.' });
    }

    const storedOtp = otpStore.get(phone);
    if (!storedOtp || storedOtp.code !== String(code).trim() || now > storedOtp.expiresAt) {
      if (verifyRecord && now < verifyRecord.resetAt) verifyRecord.attempts++;
      else verifyOtpRateLimit.set(phone, { attempts: 1, resetAt: now + 5 * 60 * 1000 });
      return res.status(400).json({ error: 'کد تایید نادرست یا منقضی شده است.' });
    }

    otpStore.delete(phone);
    verifyOtpRateLimit.delete(phone);

    try {
      let dbUser = await db.select().from(users).where(eq(users.phone, phone)).limit(1).then(r => r[0]);

      if (dbUser?.status === 'suspended') {
        return res.status(403).json({ error: 'حساب کاربری شما مسدود شده است.' });
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

      const token = generateJwtToken({ id: dbUser.id, uid: dbUser.uid, phone: dbUser.phone, role: dbUser.role, salonId: dbUser.salonId ? String(dbUser.salonId) : null });

      res.cookie('token', token, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000, path: '/' });
      res.json({ user: dbUser });
    } catch (err) {
      console.error('Error in /api/auth/verify-otp:', err);
      res.status(500).json({ error: 'خطایی در ورود رخ داد.' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' });
    res.json({ success: true, message: 'با موفقیت خارج شدید.' });
  });

  app.get('/api/profile', requireAuth, (req: AuthRequest, res) => res.json(req.dbUser));

  // --- Salons CRUD (DB Exclusive) ---
  app.get('/api/salons', async (req, res) => {
    try {
      res.json(await db.select().from(salons));
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت لیست سالن‌ها.' });
    }
  });

  app.post('/api/salons', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const data = req.body;
      let tenantId = data.tenantId;
      if (req.dbUser.role === 'salon_admin' && req.dbUser.salonId) {
        const s = await db.select().from(salons).where(eq(salons.id, Number(req.dbUser.salonId))).limit(1).then(r => r[0]);
        if (s) tenantId = s.tenantId;
      }
      const [inserted] = await db.insert(salons).values({
        tenantId: tenantId || `tnt-${Date.now()}`,
        name: data.name,
        address: data.address || 'تهران',
        phone: data.phone || '02100000000',
        province: data.province || 'تهران',
        city: data.city || 'تهران',
        district: data.district || 'مرکز',
        isApproved: true,
      }).returning();
      res.status(201).json(inserted);
    } catch (err) {
      res.status(500).json({ error: 'خطا در ثبت سالن.' });
    }
  });

  app.patch('/api/salons/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const target = await db.select().from(salons).where(eq(salons.id, id)).limit(1).then(r => r[0]);
      if (!target) return res.status(404).json({ error: 'سالن یافت نشد.' });

      if (req.dbUser.role === 'salon_admin') {
        const userSid = String(req.dbUser.salonId || '');
        if (String(target.id) !== userSid && target.tenantId !== userSid) return res.status(403).json({ error: 'عدم دسترسی.' });
      }

      const [updated] = await db.update(salons).set(req.body).where(eq(salons.id, id)).returning();
      res.json({ success: true, salon: updated });
    } catch (err) {
      res.status(500).json({ error: 'خطا در ویرایش.' });
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

  // --- Platform Users CRUD (DB Exclusive) ---
  app.get('/api/users', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      let userList = await db.select().from(users).orderBy(desc(users.createdAt));
      if (req.dbUser.role === 'salon_admin') {
        const sid = req.dbUser.salonId;
        userList = sid ? userList.filter(u => u.salonId === sid) : [];
      }
      res.json(userList);
    } catch (err) {
      res.status(500).json({ error: 'خطا در دریافت کاربران.' });
    }
  });

  app.post('/api/users', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const { phone: rawPhone, role: rawRole, ...rest } = req.body;
      const phone = normalizePhone(rawPhone);
      if (!phone) return res.status(400).json({ error: 'شماره معتبر نیست.' });

      const roleMap: any = { 'salon_owner': 'salon_admin', 'specialist': 'salon_specialist' };
      let role = roleMap[rawRole] || rawRole || 'customer';

      let salonId = rest.salonId ? Number(rest.salonId) : null;
      if (req.dbUser.role === 'salon_admin') {
        salonId = req.dbUser.salonId;
        if (role === 'super_admin' || role === 'salon_admin') role = 'salon_specialist';
      }

      const existing = await db.select().from(users).where(eq(users.phone, phone)).limit(1).then(r => r[0]);
      if (existing) {
        const [u] = await db.update(users).set({ fullName: rest.fullName || rest.name, role, salonId, status: rest.status }).where(eq(users.id, existing.id)).returning();
        return res.json(u);
      }
      const [u] = await db.insert(users).values({ uid: `phone_${phone}`, phone, fullName: rest.fullName || rest.name || `کاربر ${phone.slice(-4)}`, email: `${phone}@boya.ir`, role, salonId, status: rest.status || 'active' }).returning();
      res.status(201).json(u);
    } catch (err) {
      res.status(500).json({ error: 'خطا در ثبت کاربر.' });
    }
  });

  app.patch('/api/users/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const target = await db.select().from(users).where(eq(users.id, id)).limit(1).then(r => r[0]);
      if (!target) return res.status(404).json({ error: 'کاربر یافت نشد.' });

      const isSelf = req.dbUser.id === target.id;
      const isSuper = req.dbUser.role === 'super_admin';
      const isSalonAdminOf = req.dbUser.role === 'salon_admin' && req.dbUser.salonId === target.salonId;

      if (!isSelf && !isSuper && !isSalonAdminOf) return res.status(403).json({ error: 'عدم دسترسی.' });

      const { role: rawRole, ...patch } = req.body;
      const roleMap: any = { 'salon_owner': 'salon_admin', 'specialist': 'salon_specialist' };
      const role = rawRole ? (roleMap[rawRole] || rawRole) : undefined;

      const [updated] = await db.update(users).set({ ...patch, role: isSuper ? role : undefined }).where(eq(users.id, id)).returning();
      res.json({ success: true, user: updated });
    } catch (err) {
      res.status(500).json({ error: 'خطا در ویرایش.' });
    }
  });

  app.delete('/api/users/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const target = await db.select().from(users).where(eq(users.id, id)).limit(1).then(r => r[0]);
      if (!target) return res.status(404).json({ error: 'کاربر یافت نشد.' });

      if (req.dbUser.role === 'salon_admin' && (target.salonId !== req.dbUser.salonId || target.role === 'super_admin')) return res.status(403).json({ error: 'عدم دسترسی.' });

      await db.delete(users).where(eq(users.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف.' });
    }
  });

  // --- Bookings CRUD (DB Exclusive) ---
  app.post('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const booking = await createBooking({ ...req.body, customerId: req.dbUser.id });
      if (!booking) throw new Error('خطا.');
      await sendMeliPayamakSms(req.dbUser.phone, `نوبت شما ثبت شد. کد رهگیری: ${booking.trackingCode}`);
      res.status(201).json(booking);
    } catch (err: any) {
      res.status(400).json({ error: 'خطا در ثبت نوبت.' });
    }
  });

  app.get('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      res.json(await getBookingsForUser(req.dbUser));
    } catch (err: any) {
      if (err.message === 'FORBIDDEN_NO_SALON') return res.status(403).json({ error: 'عدم دسترسی.' });
      res.status(500).json({ error: 'خطا.' });
    }
  });

  app.patch('/api/bookings/:id/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const bid = Number(req.params.id);
      const target = await db.query.bookings.findFirst({ where: eq(bookingsTable.id, bid), with: { salon: true, specialist: true } });
      if (!target) return res.status(404).json({ error: 'یافت نشد.' });

      const isSuper = req.dbUser.role === 'super_admin';
      const isSalon = req.dbUser.role === 'salon_admin' && (req.dbUser.salonId === target.salonId);
      const isSpec = (req.dbUser.role === 'salon_specialist' || req.dbUser.role === 'mobile_specialist') && target.specialist?.userId === req.dbUser.id && req.dbUser.salonId === target.salonId;
      const isCust = req.dbUser.role === 'customer' && target.customerId === req.dbUser.id;

      if (!isSuper && !isSalon && !isSpec && !isCust) return res.status(403).json({ error: 'عدم دسترسی.' });
      if (isCust && req.body.status !== 'cancelled') return res.status(403).json({ error: 'عدم دسترسی.' });

      const updated = await updateBookingStatus(bid, req.body.status);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: 'خطا.' });
    }
  });

  // --- Misc CRUD (Store based for now, Read-only cache intended) ---
  app.get('/api/admin/profile', requireAuth, requireRole(['super_admin']), (req, res) => res.json(serverData.adminProfile));
  app.patch('/api/admin/profile', requireAuth, requireRole(['super_admin']), (req, res) => {
    serverData.adminProfile = { ...serverData.adminProfile, ...req.body };
    saveServerData(serverData);
    res.json(serverData.adminProfile);
  });

  app.get('/api/notifications', (req, res) => res.json(serverData.notifications));
  app.post('/api/notifications', requireAuth, requireRole(['super_admin']), (req, res) => {
    const n = { ...req.body, id: `notif-${Date.now()}` };
    serverData.notifications = [n, ...serverData.notifications];
    saveServerData(serverData);
    res.status(201).json(n);
  });

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
