import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { createBooking, getBookingsForUser, updateBookingStatus } from './src/db/bookings.ts';
import { getOrCreateUserByPhone } from './src/db/users.ts';
import { sendMeliPayamakSms } from './src/lib/meliPayamak.ts';
import { loadServerData, saveServerData } from './src/lib/serverDataStore.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));
  app.use(cookieParser());

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

  // SMS Logger Mock
  const logSms = (phone: string, message: string) => {
    console.log(`[SMS] To: ${phone} | Content: ${message}`);
  };

  // --- API Routes ---

  // Upload Compressed Image or Document File
  app.post('/api/upload', (req, res) => {
    try {
      const { fileData } = req.body;
      if (!fileData) {
        return res.status(400).json({ error: 'محتوای فایل دریافت نشد' });
      }

      const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.json({ url: fileData });
      }

      const mimeType = matches[1];
      const extension = mimeType.includes('webp')
        ? 'webp'
        : mimeType.includes('pdf')
        ? 'pdf'
        : mimeType.includes('png')
        ? 'png'
        : 'jpg';

      const buffer = Buffer.from(matches[2], 'base64');
      const savedFileName = `file_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;
      const savePath = path.join(uploadsDir, savedFileName);

      fs.writeFileSync(savePath, buffer);
      console.log(`[FILE UPLOAD LOG] Saved file: ${savedFileName} (${Math.round(buffer.length / 1024)} KB)`);

      res.json({ url: `/uploads/${savedFileName}` });
    } catch (err) {
      console.error('Upload Error:', err);
      res.status(500).json({ error: 'خطا در ذخیره‌سازی فایل روی سرور' });
    }
  });

  // Phone OTP Auth
  app.post('/api/auth/send-otp', async (req, res) => {
    const { phone } = req.body;
    if (!phone || !/^09\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'شماره همراه وارد شده معتبر نمی‌باشد (نمونه: ۰۹۱۲۳۴۵۶۷۸۹)' });
    }

    const otpCode = '12345'; // Standard dev OTP code
    await sendMeliPayamakSms(phone, `کد ورودی یکبار مصرف پلتفرم زیبایی بویا: ${otpCode}`);

    res.json({
      success: true,
      message: 'کد تایید پیامکی از طریق سامانه ملی پیامک ارسال گردید.',
      devCode: otpCode,
    });
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    const { phone, code, fullName } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'شماره همراه و کد تایید الزامی است.' });
    }

    if (code !== '12345' && code !== '54321') {
      return res.status(400).json({ error: 'کد تایید وارد شده نادرست یا منقضی شده است.' });
    }

    try {
      const dbUser = await getOrCreateUserByPhone(phone, fullName);
      const token = `phone_${phone}`;
      res.json({ token, user: dbUser });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'خطایی در ثبت یا ورود کاربر رخ داد.' });
    }
  });

  // User Profile
  app.get('/api/profile', requireAuth, (req: AuthRequest, res) => {
    res.json(req.dbUser);
  });

  // Salons & Services
  // Persistent Server DB State
  let serverData = loadServerData();

  // --- Salons CRUD ---
  app.get('/api/salons', (req, res) => {
    res.json(serverData.salons);
  });

  app.post('/api/salons', (req, res) => {
    try {
      const newSalon = req.body;
      if (!newSalon.id) {
        newSalon.id = `salon-${Date.now()}`;
      }
      serverData.salons = [newSalon, ...serverData.salons];
      saveServerData(serverData);
      res.status(201).json(newSalon);
    } catch (err) {
      res.status(500).json({ error: 'خطا در ثبت سالن جدید روی سرور' });
    }
  });

  app.patch('/api/salons/:id', (req, res) => {
    try {
      const salonId = req.params.id;
      const patch = req.body;
      serverData.salons = serverData.salons.map((s) => (String(s.id) === String(salonId) ? { ...s, ...patch } : s));
      saveServerData(serverData);
      res.json({ success: true, salonId });
    } catch (err) {
      res.status(500).json({ error: 'خطا در ویرایش اطلاعات سالن' });
    }
  });

  app.delete('/api/salons/:id', (req, res) => {
    try {
      const salonId = req.params.id;
      serverData.salons = serverData.salons.filter((s) => String(s.id) !== String(salonId));
      saveServerData(serverData);
      res.json({ success: true, deletedId: salonId });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف سالن' });
    }
  });

  // --- Platform Users CRUD ---
  app.get('/api/users', (req, res) => {
    res.json(serverData.users);
  });

  app.post('/api/users', (req, res) => {
    try {
      const newUser = req.body;
      if (!newUser.id) {
        newUser.id = `usr-${Date.now()}`;
      }
      serverData.users = [newUser, ...serverData.users];
      saveServerData(serverData);
      res.status(201).json(newUser);
    } catch (err) {
      res.status(500).json({ error: 'خطا در ثبت کاربر جدید' });
    }
  });

  app.patch('/api/users/:id', (req, res) => {
    try {
      const userId = req.params.id;
      const patch = req.body;
      serverData.users = serverData.users.map((u) => (String(u.id) === String(userId) ? { ...u, ...patch } : u));
      saveServerData(serverData);
      res.json({ success: true, userId });
    } catch (err) {
      res.status(500).json({ error: 'خطا در ویرایش کاربر' });
    }
  });

  app.delete('/api/users/:id', (req, res) => {
    try {
      const userId = req.params.id;
      serverData.users = serverData.users.filter((u) => String(u.id) !== String(userId));
      saveServerData(serverData);
      res.json({ success: true, deletedId: userId });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف کاربر' });
    }
  });

  // --- Super Admin Profile ---
  app.get('/api/admin/profile', (req, res) => {
    res.json(serverData.adminProfile);
  });

  app.patch('/api/admin/profile', (req, res) => {
    try {
      const patch = req.body;
      serverData.adminProfile = { ...serverData.adminProfile, ...patch };
      saveServerData(serverData);
      res.json(serverData.adminProfile);
    } catch (err) {
      res.status(500).json({ error: 'خطا در ذخیره‌سازی اطلاعات پروفایل ادمین' });
    }
  });

  // --- Notifications CRUD ---
  app.get('/api/notifications', (req, res) => {
    res.json(serverData.notifications);
  });

  app.post('/api/notifications', (req, res) => {
    try {
      const notif = req.body;
      serverData.notifications = [notif, ...serverData.notifications];
      saveServerData(serverData);
      res.status(201).json(notif);
    } catch (err) {
      res.status(500).json({ error: 'خطا در ثبت اعلان جدید' });
    }
  });

  app.patch('/api/notifications/:id', (req, res) => {
    try {
      const id = req.params.id;
      const patch = req.body;
      serverData.notifications = serverData.notifications.map((n) => (n.id === id ? { ...n, ...patch } : n));
      saveServerData(serverData);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطا در تغییر اعلان' });
    }
  });

  app.delete('/api/notifications/:id', (req, res) => {
    try {
      const id = req.params.id;
      serverData.notifications = serverData.notifications.filter((n) => n.id !== id);
      saveServerData(serverData);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف اعلان' });
    }
  });

  // Bookings
  app.post('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.body.customerName && req.dbUser?.id) {
        await db.update(users)
          .set({ fullName: req.body.customerName })
          .where(eq(users.id, req.dbUser.id));
      }

      const booking = await createBooking({
        ...req.body,
        customerId: req.dbUser.id,
      });

      serverData.bookings = [booking, ...serverData.bookings];
      saveServerData(serverData);
      
      await sendMeliPayamakSms(req.dbUser.phone || '09120000000', `نوبت شما در سامانه بویا ثبت شد. کد رهگیری: ${booking.trackingCode}`);
      
      res.status(201).json(booking);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/bookings', async (req: AuthRequest, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        const phone = token.startsWith('phone_') ? token.replace('phone_', '') : token;
        const dbUser = await getOrCreateUserByPhone(phone);
        if (dbUser) {
          const dbBookings = await getBookingsForUser(dbUser);
          return res.json(dbBookings.length > 0 ? dbBookings : serverData.bookings);
        }
      }
      res.json(serverData.bookings);
    } catch (err) {
      res.json(serverData.bookings);
    }
  });

  app.patch('/api/bookings/:id/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { status } = req.body;
      const updated = await updateBookingStatus(Number(req.params.id), status);
      
      serverData.bookings = serverData.bookings.map((b) => (String(b.id) === String(req.params.id) ? { ...b, status } : b));
      saveServerData(serverData);

      await sendMeliPayamakSms(req.dbUser.phone || '09120000000', `وضعیت نوبت شما به ${status} تغییر یافت.`);
      
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update booking' });
    }
  });

  // Proxy to external legacy backend
  app.use('/api/v1', createProxyMiddleware({
    target: 'https://boya.bcshopir.ir/api/v1',
    changeOrigin: true,
    pathRewrite: { '^/api/v1': '' },
  }));

  // Vite integration
  let vite: any;
  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
  }

  // Fallback to index.html for SPA
  app.use('*', async (req, res) => {
    const url = req.originalUrl;
    try {
      let template: string;
      if (!isProd) {
        template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
      } else {
        template = fs.readFileSync(path.resolve(__dirname, 'dist/index.html'), 'utf-8');
      }
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e: any) {
      if (!isProd) vite.ssrFixStacktrace(e);
      console.error(e.stack);
      res.status(500).end(isProd ? 'Internal Server Error' : e.stack);
    }
  });

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

createServer();
