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
import { normalizePhone } from './src/shared/utils/persianUtils.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function createServer() {
  const app = express();
  let serverData = loadServerData();
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
    const phone = normalizePhone(req.body.phone);
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
    const { phone: rawPhone, code, fullName } = req.body;
    const phone = normalizePhone(rawPhone);
    if (!phone || !code) {
      return res.status(400).json({ error: 'شماره همراه و کد تایید الزامی است.' });
    }

    if (code !== '12345' && code !== '54321') {
      return res.status(400).json({ error: 'کد تایید وارد شده نادرست یا منقضی شده است.' });
    }

    try {
      // 1. Check if user exists in PostgreSQL DB (THE PRIMARY SOURCE OF TRUTH)
      let dbUser = await db.select().from(users).where(eq(users.phone, phone)).limit(1).then(r => r[0]);

      // 2. If not in DB, check if user exists in serverData (configured by Admin in AdminUsersView)
      if (!dbUser) {
        const userInStore = serverData.users.find(u => normalizePhone(u.phone) === phone);
        if (userInStore) {
          const roleMap: Record<string, string> = {
            'salon_owner': 'salon_admin',
            'specialist': 'salon_specialist',
            'independent_specialist': 'line_manager',
          };
          const mappedRole = roleMap[userInStore.role] || userInStore.role || 'customer';
          // Create in DB with role from store
          dbUser = await db.insert(users).values({
            uid: `phone_${phone}`,
            phone: phone,
            fullName: userInStore.fullName || userInStore.name || `کاربر ${phone.slice(-4)}`,
            email: userInStore.email || `${phone}@boya.ir`,
            role: mappedRole as any,
            salonId: userInStore.salonId ? String(userInStore.salonId) : null,
          }).returning().then(r => r[0]);
        }
      }

      // 3. If still not found, create or get user by phone
      if (!dbUser) {
        dbUser = await getOrCreateUserByPhone(phone, fullName);
      }

      const token = `phone_${phone}`;
      res.json({ token, user: dbUser });
    } catch (err) {
      console.error('Error in /api/auth/verify-otp:', err);
      res.status(500).json({ error: 'خطایی در ثبت یا ورود کاربر رخ داد.' });
    }
  });

  // User Profile
  app.get('/api/profile', requireAuth, (req: AuthRequest, res) => {
    res.json(req.dbUser);
  });

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

  app.post('/api/users', async (req, res) => {
    try {
      const newUser = req.body;
      const phone = normalizePhone(newUser.phone);
      if (!phone) {
        return res.status(400).json({ error: 'شماره تلفن معتبر نیست' });
      }

      if (!newUser.id) {
        newUser.id = `usr-${Date.now()}`;
      }
      newUser.phone = phone;

      const roleMap: Record<string, string> = {
        'salon_owner': 'salon_admin',
        'specialist': 'salon_specialist',
        'independent_specialist': 'line_manager',
      };
      const role = roleMap[newUser.role] || newUser.role || 'customer';
      newUser.role = role;

      const salonId = newUser.salonId ? String(newUser.salonId) : null;

      // Update DB (check if already exists by phone)
      const existingUser = await db.select().from(users).where(eq(users.phone, phone)).limit(1).then(r => r[0]);
      if (existingUser) {
        await db.update(users).set({
          fullName: newUser.fullName || newUser.name || existingUser.fullName,
          role: role as any,
          salonId: salonId || existingUser.salonId,
          email: newUser.email || existingUser.email,
        }).where(eq(users.id, existingUser.id));
      } else {
        await db.insert(users).values({
          uid: `phone_${phone}`,
          phone,
          fullName: newUser.fullName || newUser.name || `کاربر ${phone.slice(-4)}`,
          email: newUser.email || `${phone}@boya.ir`,
          role: role as any,
          salonId,
        });
      }

      // Upsert into serverData
      const idx = serverData.users.findIndex(u => normalizePhone(u.phone) === phone || String(u.id) === String(newUser.id));
      if (idx >= 0) {
        serverData.users[idx] = { ...serverData.users[idx], ...newUser, phone, role, salonId };
      } else {
        serverData.users = [{ ...newUser, phone, role, salonId }, ...serverData.users];
      }
      saveServerData(serverData);

      res.status(201).json(newUser);
    } catch (err) {
      console.error('Error saving user in /api/users:', err);
      res.status(500).json({ error: 'خطا در ثبت کاربر جدید در دیتابیس' });
    }
  });

  app.patch('/api/users/:id', async (req, res) => {
    try {
      const userId = req.params.id;
      const patch = req.body;
      
      const userIdx = serverData.users.findIndex(u => String(u.id) === String(userId));
      const existingUser = userIdx >= 0 ? serverData.users[userIdx] : null;

      const roleMap: Record<string, string> = {
        'salon_owner': 'salon_admin',
        'specialist': 'salon_specialist',
        'independent_specialist': 'line_manager',
      };
      const targetRole = patch.role ? (roleMap[patch.role] || patch.role) : undefined;
      const targetPhone = patch.phone ? normalizePhone(patch.phone) : undefined;
      const userPhone = targetPhone || (existingUser ? normalizePhone(existingUser.phone) : null);

      // Update DB if phone known
      if (userPhone) {
        const dbExisting = await db.select().from(users).where(eq(users.phone, userPhone)).limit(1).then(r => r[0]);
        if (dbExisting) {
          const dbUpdates: any = {};
          if (patch.fullName || patch.name) dbUpdates.fullName = patch.fullName || patch.name;
          if (targetRole) dbUpdates.role = targetRole;
          if (patch.salonId !== undefined) dbUpdates.salonId = patch.salonId ? String(patch.salonId) : null;
          if (patch.email) dbUpdates.email = patch.email;
          if (Object.keys(dbUpdates).length > 0) {
            await db.update(users).set(dbUpdates).where(eq(users.id, dbExisting.id));
          }
        }
      }

      if (userIdx >= 0) {
        serverData.users[userIdx] = {
          ...serverData.users[userIdx],
          ...patch,
          ...(targetRole ? { role: targetRole } : {}),
          ...(targetPhone ? { phone: targetPhone } : {}),
        };
        saveServerData(serverData);
      }

      res.json({ success: true, userId });
    } catch (err) {
      console.error('Error updating user in /api/users/:id:', err);
      res.status(500).json({ error: 'خطا در ویرایش کاربر' });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const userId = req.params.id;
      const target = serverData.users.find((u) => String(u.id) === String(userId));
      if (target && target.phone) {
        const phone = normalizePhone(target.phone);
        await db.delete(users).where(eq(users.phone, phone)).catch(() => {});
      }
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
      server: {
        middlewareMode: true,
        hmr: false,
      },
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
