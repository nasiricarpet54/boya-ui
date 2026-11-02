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
import { eq } from 'drizzle-orm';
import { createBooking, getBookingsForUser, updateBookingStatus } from './src/db/bookings.ts';
import { getOrCreateUserByPhone, sanitizeRole } from './src/db/users.ts';
import { sendMeliPayamakSms } from './src/lib/meliPayamak.ts';
import { loadServerData, saveServerData } from './src/lib/serverDataStore.ts';
import { normalizePhone } from './src/shared/utils/persianUtils.ts';
import { generateJwtToken } from './src/lib/jwt.ts';
import { seedDatabase } from './src/db/seed.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

// In-memory OTP storage for phone verification
const otpStore = new Map<string, { code: string; expiresAt: number }>();

async function createServer() {
  const app = express();
  let serverData = loadServerData();
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));
  app.use(cookieParser());

  // Run database seed in background on startup to ensure all tables & relations are populated
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
      console.log(`[FILE UPLOAD LOG] User: ${req.dbUser?.phone} saved file: ${savedFileName} (${Math.round(buffer.length / 1024)} KB)`);

      res.json({ url: `/uploads/${savedFileName}` });
    } catch (err) {
      console.error('Upload Error:', err);
      res.status(500).json({ error: 'خطا در ذخیره‌سازی فایل روی سرور.' });
    }
  });

  // Phone OTP Auth: Send OTP with live backend server logging
  app.post('/api/auth/send-otp', async (req, res) => {
    const phone = normalizePhone(req.body.phone);
    if (!phone || !/^09\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'شماره همراه وارد شده معتبر نمی‌باشد (نمونه: ۰۹۱۲۳۴۵۶۷۸۹).' });
    }

    // Generate unpredictable 5-digit verification code
    const otpCode = Math.floor(10000 + Math.random() * 90000).toString();

    // Store in memory with 5-minute expiry
    otpStore.set(phone, {
      code: otpCode,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    // Prominent live backend server log for testing & inspection (Development/Test only)
    if (!isProd) {
      console.log(`\n==================================================`);
      console.log(`📲 [MELIPAYAMAK OTP LIVE BACKEND LOG]`);
      console.log(`   گیرنده: ${phone}`);
      console.log(`   کد تایید یکبار مصرف (OTP): ${otpCode}`);
      console.log(`   مهلت اعتبار: ۵ دقیقه`);
      console.log(`   زمان ارسال: ${new Date().toLocaleTimeString('fa-IR')}`);
      console.log(`==================================================\n`);
    }

    // Attempt live sending via MeliPayamak
    await sendMeliPayamakSms(phone, `کد ورودی یکبار مصرف پلتفرم زیبایی بویا: ${otpCode}`);

    res.json({
      success: true,
      message: 'کد تایید پیامکی از طریق سامانه ملی پیامک ارسال گردید.',
    });
  });

  // Verify OTP and issue real JWT token
  app.post('/api/auth/verify-otp', async (req, res) => {
    const { phone: rawPhone, code, fullName } = req.body;
    const phone = normalizePhone(rawPhone);
    if (!phone || !code) {
      return res.status(400).json({ error: 'شماره همراه و کد تایید الزامی است.' });
    }

    const storedOtp = otpStore.get(phone);
    const isValidCode = Boolean(
      storedOtp &&
      storedOtp.code === String(code).trim() &&
      Date.now() <= storedOtp.expiresAt
    );

    if (!isValidCode) {
      return res.status(400).json({ error: 'کد تایید وارد شده نادرست یا منقضی شده است.' });
    }

    // Clear used OTP
    otpStore.delete(phone);

    try {
      // 1. Fetch user strictly from PostgreSQL DB (the single source of truth for roles)
      let dbUser = await db.select().from(users).where(eq(users.phone, phone)).limit(1).then(r => r[0]);

      const userInStore = serverData.users.find(u => normalizePhone(u.phone) === phone);
      if ((dbUser && dbUser.status === 'suspended') || (userInStore && userInStore.status === 'suspended')) {
        return res.status(403).json({ error: 'حساب کاربری شما توسط مدیریت مسدود شده است.' });
      }

      if (dbUser) {
        dbUser.role = sanitizeRole(dbUser.role);
      }

      // 2. New user registration: Strictly 'customer' role (Prevents A-05 Role Escalation)
      if (!dbUser) {
        const [newUser] = await db.insert(users).values({
          uid: `phone_${phone}`,
          phone,
          fullName: fullName || `کاربر ${phone.slice(-4)}`,
          email: `${phone}@boya.ir`,
          role: 'customer',
          salonId: null,
        }).returning();
        dbUser = newUser;
      }

      // Sync into serverData.users store
      const storeIdx = serverData.users.findIndex(u => normalizePhone(u.phone) === phone);
      if (storeIdx >= 0) {
        serverData.users[storeIdx] = {
          ...serverData.users[storeIdx],
          id: dbUser.id,
          fullName: dbUser.fullName,
          role: dbUser.role,
          phone: dbUser.phone,
          email: dbUser.email,
        };
      } else {
        serverData.users = [
          {
            id: dbUser.id,
            uid: dbUser.uid,
            fullName: dbUser.fullName,
            phone: dbUser.phone,
            email: dbUser.email,
            role: dbUser.role,
            salonId: dbUser.salonId,
            createdAt: new Date().toISOString(),
          },
          ...serverData.users,
        ];
      }
      saveServerData(serverData);

      // Generate real cryptographically signed JWT token
      const token = generateJwtToken({
        id: dbUser.id,
        uid: dbUser.uid,
        phone: dbUser.phone,
        role: dbUser.role,
        salonId: dbUser.salonId,
      });

      // Set secure HttpOnly cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({ token, user: dbUser });
    } catch (err) {
      console.error('Error in /api/auth/verify-otp:', err);
      res.status(500).json({ error: 'خطایی در ثبت یا ورود کاربر رخ داد.' });
    }
  });

  // Logout endpoint (Clears HttpOnly cookie)
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'با موفقیت خارج شدید.' });
  });

  // User Profile (Protected - Server Verification)
  app.get('/api/profile', requireAuth, (req: AuthRequest, res) => {
    res.json(req.dbUser);
  });

  // --- Salons CRUD ---
  // Public GET for browsing salons
  app.get('/api/salons', (req, res) => {
    res.json(serverData.salons);
  });

  // Protected: Only super_admin or salon_admin can create salons
  app.post('/api/salons', requireAuth, requireRole(['super_admin', 'salon_admin']), (req: AuthRequest, res) => {
    try {
      const newSalon = req.body;
      if (!newSalon.id) {
        newSalon.id = `salon-${Date.now()}`;
      }
      if (req.dbUser.role === 'salon_admin' && req.dbUser.salonId) {
        newSalon.tenantId = req.dbUser.salonId;
      }
      serverData.salons = [newSalon, ...serverData.salons];
      saveServerData(serverData);
      res.status(201).json(newSalon);
    } catch (err) {
      res.status(500).json({ error: 'خطا در ثبت سالن جدید روی سرور.' });
    }
  });

  // Protected: salon_admin can only edit their own salonId, super_admin can edit any
  app.patch('/api/salons/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), (req: AuthRequest, res) => {
    try {
      const salonId = req.params.id;
      if (req.dbUser.role === 'salon_admin') {
        const userSalonId = req.dbUser.salonId ? String(req.dbUser.salonId) : null;
        const targetSalon = serverData.salons.find(s => String(s.id) === String(salonId) || String(s.tenantId) === String(salonId));
        const targetSalonId = targetSalon ? String(targetSalon.id) : String(salonId);
        const targetTenantId = targetSalon ? String(targetSalon.tenantId) : null;

        if (!userSalonId || (userSalonId !== targetSalonId && userSalonId !== targetTenantId)) {
          return res.status(403).json({ error: 'عدم دسترسی: شما تنها مجاز به ویرایش سالن خود می‌باشید.' });
        }
      }

      const patch = req.body;
      serverData.salons = serverData.salons.map((s) => (String(s.id) === String(salonId) ? { ...s, ...patch } : s));
      saveServerData(serverData);
      res.json({ success: true, salonId });
    } catch (err) {
      res.status(500).json({ error: 'خطا در ویرایش اطلاعات سالن.' });
    }
  });

  // Protected: Only super_admin can delete a salon
  app.delete('/api/salons/:id', requireAuth, requireRole(['super_admin']), (req: AuthRequest, res) => {
    try {
      const salonId = req.params.id;
      serverData.salons = serverData.salons.filter((s) => String(s.id) !== String(salonId));
      saveServerData(serverData);
      res.json({ success: true, deletedId: salonId });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف سالن.' });
    }
  });

  // --- Platform Users CRUD ---
  // Protected: Only super_admin and salon_admin can view users
  app.get('/api/users', requireAuth, requireRole(['super_admin', 'salon_admin']), (req: AuthRequest, res) => {
    if (req.dbUser.role === 'salon_admin') {
      const userSalonId = req.dbUser.salonId ? String(req.dbUser.salonId) : null;
      if (!userSalonId) {
        return res.json([]);
      }
      const filtered = serverData.users.filter((u) => u.salonId && String(u.salonId) === userSalonId);
      return res.json(filtered);
    }
    res.json(serverData.users);
  });

  // Protected: Create user
  app.post('/api/users', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const newUser = req.body;
      const phone = normalizePhone(newUser.phone);
      if (!phone) {
        return res.status(400).json({ error: 'شماره تلفن وارد شده معتبر نیست.' });
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
      let role = roleMap[newUser.role] || newUser.role || 'customer';

      // Salon admin cannot create super_admins and can only assign to their salon
      let salonId = newUser.salonId ? String(newUser.salonId) : null;
      if (req.dbUser.role === 'salon_admin') {
        salonId = String(req.dbUser.salonId || '');
        if (role === 'super_admin' || role === 'salon_admin') {
          role = 'salon_specialist';
        }
      }
      newUser.role = role;
      newUser.salonId = salonId;

      // Update DB
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
      res.status(500).json({ error: 'خطا در ثبت کاربر جدید در دیتابیس.' });
    }
  });

  // Protected: Edit user (Ownership / Salon check)
  app.patch('/api/users/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.params.id;
      const patch = req.body;
      const userIdx = serverData.users.findIndex(u => String(u.id) === String(userId));
      const targetUser = userIdx >= 0 ? serverData.users[userIdx] : null;

      // Check ownership
      const isSelf = String(req.dbUser.id) === String(userId) || req.dbUser.phone === targetUser?.phone;
      const isSuperAdmin = req.dbUser.role === 'super_admin';

      const userSalonId = req.dbUser.salonId ? String(req.dbUser.salonId) : null;
      const targetSalonId = targetUser?.salonId ? String(targetUser.salonId) : null;
      const isSalonAdminOfUser = req.dbUser.role === 'salon_admin' && 
                                 userSalonId !== null && 
                                 targetSalonId !== null && 
                                 userSalonId === targetSalonId;

      if (!isSelf && !isSuperAdmin && !isSalonAdminOfUser) {
        return res.status(403).json({ error: 'عدم دسترسی: شما مجاز به ویرایش این کاربر نمی‌باشید.' });
      }

      const roleMap: Record<string, string> = {
        'salon_owner': 'salon_admin',
        'specialist': 'salon_specialist',
        'independent_specialist': 'line_manager',
      };
      let targetRole = patch.role ? (roleMap[patch.role] || patch.role) : undefined;
      if (req.dbUser.role !== 'super_admin' && targetRole === 'super_admin') {
        targetRole = undefined; // Non-superadmins cannot grant super_admin
      }

      const targetPhone = patch.phone ? normalizePhone(patch.phone) : undefined;
      const userPhone = targetPhone || (targetUser ? normalizePhone(targetUser.phone) : null);

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
      res.status(500).json({ error: 'خطا در ویرایش کاربر.' });
    }
  });

  // Protected: Delete user
  app.delete('/api/users/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
    try {
      const userId = req.params.id;
      const target = serverData.users.find((u) => String(u.id) === String(userId));

      if (req.dbUser.role === 'salon_admin') {
        if (!target || String(target.salonId) !== String(req.dbUser.salonId) || target.role === 'super_admin') {
          return res.status(403).json({ error: 'عدم دسترسی: شما تنها مجاز به حذف پرسنل سالن خود هستید.' });
        }
      }

      if (target && target.phone) {
        const phone = normalizePhone(target.phone);
        await db.delete(users).where(eq(users.phone, phone)).catch(() => {});
      }
      serverData.users = serverData.users.filter((u) => String(u.id) !== String(userId));
      saveServerData(serverData);
      res.json({ success: true, deletedId: userId });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف کاربر.' });
    }
  });

  // --- Super Admin Profile ---
  app.get('/api/admin/profile', requireAuth, requireRole(['super_admin']), (req: AuthRequest, res) => {
    res.json(serverData.adminProfile);
  });

  app.patch('/api/admin/profile', requireAuth, requireRole(['super_admin']), (req: AuthRequest, res) => {
    try {
      const patch = req.body;
      serverData.adminProfile = { ...serverData.adminProfile, ...patch };
      saveServerData(serverData);
      res.json(serverData.adminProfile);
    } catch (err) {
      res.status(500).json({ error: 'خطا در ذخیره‌سازی اطلاعات پروفایل ادمین.' });
    }
  });

  // --- Notifications CRUD ---
  // Public GET for banners/announcements
  app.get('/api/notifications', (req, res) => {
    res.json(serverData.notifications);
  });

  // Protected: Only super_admin can create, update, delete notifications
  app.post('/api/notifications', requireAuth, requireRole(['super_admin']), (req: AuthRequest, res) => {
    try {
      const notif = req.body;
      if (!notif.id) {
        notif.id = `notif-${Date.now()}`;
      }
      serverData.notifications = [notif, ...serverData.notifications];
      saveServerData(serverData);
      res.status(201).json(notif);
    } catch (err) {
      res.status(500).json({ error: 'خطا در ثبت اعلان جدید.' });
    }
  });

  app.patch('/api/notifications/:id', requireAuth, requireRole(['super_admin']), (req: AuthRequest, res) => {
    try {
      const id = req.params.id;
      const patch = req.body;
      serverData.notifications = serverData.notifications.map((n) => (n.id === id ? { ...n, ...patch } : n));
      saveServerData(serverData);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطا در تغییر اعلان.' });
    }
  });

  app.delete('/api/notifications/:id', requireAuth, requireRole(['super_admin']), (req: AuthRequest, res) => {
    try {
      const id = req.params.id;
      serverData.notifications = serverData.notifications.filter((n) => n.id !== id);
      saveServerData(serverData);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'خطا در حذف اعلان.' });
    }
  });

  // --- Bookings Endpoints ---

  // Create Booking (Protected)
  app.post('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.body.customerName && req.dbUser?.id) {
        await db.update(users)
          .set({ fullName: req.body.customerName })
          .where(eq(users.id, req.dbUser.id))
          .catch(() => {});
      }

      const booking = await createBooking({
        ...req.body,
        customerId: req.dbUser.id,
      });

      if (!booking) {
        throw new Error('خطا در ثبت نوبت.');
      }

      // Synchronize in memory server store
      serverData.bookings = [booking, ...serverData.bookings];
      saveServerData(serverData);

      // Send confirmation SMS via MeliPayamak
      const userPhone = req.dbUser.phone || '09120000000';
      await sendMeliPayamakSms(
        userPhone,
        `نوبت شما در سامانه بویا ثبت شد. کد رهگیری: ${booking.trackingCode}`
      );

      res.status(201).json(booking);
    } catch (err: any) {
      console.error('Error creating booking:', err);
      res.status(400).json({ error: err.message || 'خطا در ثبت نوبت.' });
    }
  });

  // Get Bookings (Protected - Strictly scoped to authenticated user, NO fallback to all bookings)
  app.get('/api/bookings', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userBookings = await getBookingsForUser(req.dbUser);
      res.json(userBookings);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      res.status(500).json({ error: 'خطا در دریافت لیست نوبت‌ها.' });
    }
  });

  // Update Booking Status (Protected - Ownership & Role checked)
  app.patch('/api/bookings/:id/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const bookingId = Number(req.params.id);
      const { status } = req.body;

      // Find booking in DB to verify ownership
      const existingBooking = await db.query.bookings.findFirst({
        where: eq(bookingsTable.id, bookingId),
        with: {
          salon: true,
          specialist: true,
        },
      });

      if (!existingBooking) {
        return res.status(404).json({ error: 'نوبت مورد نظر یافت نشد.' });
      }

      // Check permissions:
      const isSuperAdmin = req.dbUser.role === 'super_admin';

      const userSalonId = req.dbUser.salonId ? String(req.dbUser.salonId) : null;
      const bookingSalonId = existingBooking.salonId ? String(existingBooking.salonId) : null;
      const bookingTenantId = existingBooking.salon?.tenantId ? String(existingBooking.salon.tenantId) : null;

      const isSalonAdmin = req.dbUser.role === 'salon_admin' && 
                           userSalonId !== null && 
                           ((bookingSalonId !== null && userSalonId === bookingSalonId) || 
                            (bookingTenantId !== null && userSalonId === bookingTenantId));

      const isSpecialist = (req.dbUser.role === 'salon_specialist' || req.dbUser.role === 'mobile_specialist') && existingBooking.specialist?.userId === req.dbUser.id;
      const isCustomer = req.dbUser.role === 'customer' && existingBooking.customerId === req.dbUser.id;

      if (!isSuperAdmin && !isSalonAdmin && !isSpecialist && !isCustomer) {
        return res.status(403).json({ error: 'عدم دسترسی: شما مجاز به تغییر وضعیت این نوبت نیستید.' });
      }

      // Customers can only cancel their own booking
      if (isCustomer && status !== 'cancelled') {
        return res.status(403).json({ error: 'مشتریان گرامی تنها مجاز به لغو نوبت خود می‌باشند.' });
      }

      const updated = await updateBookingStatus(bookingId, status);

      serverData.bookings = serverData.bookings.map((b) => (String(b.id) === String(bookingId) ? { ...b, status } : b));
      saveServerData(serverData);

      const customerRecord = existingBooking.customerId ? await db.select().from(users).where(eq(users.id, existingBooking.customerId)).limit(1).then(r => r[0]) : null;
      const customerPhone = customerRecord?.phone || '09120000000';

      await sendMeliPayamakSms(
        customerPhone,
        `وضعیت نوبت شما در بویا با کد رهگیری ${updated?.trackingCode || bookingId} به ${status} تغییر یافت.`
      );

      res.json(updated);
    } catch (err: any) {
      console.error('Error in /api/bookings/:id/status:', err);
      res.status(500).json({ error: err.message || 'خطا در تغییر وضعیت نوبت.' });
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
