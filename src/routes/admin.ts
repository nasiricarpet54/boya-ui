import { Router } from 'express';
import { db } from '../db/index.ts';
import {
  users, notifications, adminProfile, auditLogs, supportTickets, ticketMessages,
  services, specialists, portfolioItems,
} from '../db/schema.ts';
import { eq, desc, inArray, asc, sql } from 'drizzle-orm';
import { ZodError } from 'zod';
import crypto from 'crypto';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.ts';
import { verifyJwtToken } from '../lib/jwt.ts';
import * as schemas from '../lib/validation.ts';
import { sanitizeRole } from '../db/users.ts';
import { normalizePhone } from '../shared/utils/persianUtils.ts';
import { sendMeliPayamakSms } from '../lib/meliPayamak.ts';

const router = Router();

// Health probe (mounted at /api/health by server.ts).
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==========================================
// Audit logs (super_admin)
// ==========================================
router.get('/audit-logs', requireAuth, requireRole(['super_admin']), async (_req, res) => {
  try { res.json(await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200)); }
  catch { res.status(500).json({ error: 'خطا در دریافت لاگ‌ها.' }); }
});

// ==========================================
// Users CRUD (super_admin)
// ==========================================
router.get('/users', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
  try {
    const usersList = await db.select().from(users).orderBy(desc(users.createdAt));
    res.json(usersList);
  } catch (err) {
    console.error('❌ API GET USERS ERROR:', err);
    res.status(500).json({ error: 'خطا در دریافت لیست کاربران.' });
  }
});

router.post('/users', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
  try {
    const { fullName, phone, email, role } = req.body;
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) return res.status(400).json({ error: 'شماره موبایل نامعتبر است.' });

    const existingUser = await db.select().from(users).where(eq(users.phone, cleanPhone)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'کاربری با این شماره موبایل قبلاً ثبت شده است.' });
    }

    const [newUser] = await db.insert(users).values({
      uid: `phone_${cleanPhone}`,
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

router.patch('/users/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
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

router.delete('/users/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
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
// Services CRUD
// ==========================================
router.get('/services', requireAuth, async (req: AuthRequest, res) => {
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

router.post('/services', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
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

router.patch('/services/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
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

router.delete('/services/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
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
// Specialists CRUD + portfolio
// ==========================================
router.get('/specialists', requireAuth, async (req: AuthRequest, res) => {
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

router.post('/specialists', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
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

router.patch('/specialists/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
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

router.delete('/specialists/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(specialists).where(eq(specialists.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE SPECIALIST ERROR]', err);
    res.status(500).json({ error: 'خطا در حذف متخصص.' });
  }
});

router.post('/specialists/portfolio', requireAuth, requireRole(['super_admin', 'salon_admin', 'salon_specialist']), async (req: AuthRequest, res) => {
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

router.delete('/specialists/portfolio/:id', requireAuth, requireRole(['super_admin', 'salon_admin', 'salon_specialist']), async (req: AuthRequest, res) => {
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
// Notifications (read/update/delete + broadcast)
// ==========================================
// ==========================================
// Notifications (read/create/update/delete + broadcast + tracking)
// ==========================================
router.get('/notifications', async (req, res) => {
  try {
    let isStaff = false;
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req as any).cookies?.auth_token;
    if (token) {
      const decoded = verifyJwtToken(token);
      if (decoded && ['super_admin', 'salon_admin', 'line_manager'].includes(decoded.role)) {
        isStaff = true;
      }
    }

    const list = isStaff
      ? await db.select().from(notifications).orderBy(desc(notifications.createdAt))
      : await db.select().from(notifications).where(eq(notifications.isActive, true)).orderBy(desc(notifications.createdAt));
    res.json(list);
  } catch (err: any) {
    console.error('[GET NOTIFICATIONS ERROR]', err);
    res.status(500).json({ error: 'خطا در دریافت اعلانات.' });
  }
});

router.post('/notifications', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
  try {
    const {
      title,
      content,
      type = 'promotional',
      targetAudience = 'all',
      channel = 'in_app',
      displayPosition = 'banner',
      targetPanels = 'all',
      badgeText,
      actionUrl,
      actionText,
      expiresAt,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'عنوان و متن پیام الزامی است.' });
    }

    const [created] = await db.insert(notifications).values({
      title: String(title).trim(),
      content: String(content).trim(),
      type: String(type || 'promotional'),
      targetAudience: String(targetAudience || 'all'),
      channel: String(channel || 'in_app'),
      displayPosition: String(displayPosition || 'banner'),
      targetPanels: String(targetPanels || 'all'),
      badgeText: badgeText ? String(badgeText).trim() : null,
      actionUrl: actionUrl ? String(actionUrl).trim() : null,
      actionText: actionText ? String(actionText).trim() : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: true,
      viewsCount: 0,
      clicksCount: 0,
    }).returning();

    res.status(201).json(created);
  } catch (err: any) {
    console.error('[POST NOTIFICATIONS ERROR]', err);
    res.status(500).json({ error: 'خطا در ایجاد اعلان.' });
  }
});

router.post('/notifications/broadcast', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
  try {
    const { title, content, targetAudience, testPhone } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'عنوان و متن الزامی است.' });
    let sc = 0;

    if (testPhone) {
      const clean = normalizePhone(testPhone);
      if (clean) {
        try {
          await sendMeliPayamakSms(clean, `${title}\n${content}`);
          sc++;
        } catch (e) {
          console.error('[TEST SMS ERROR]', e);
        }
      }
    } else {
      const audienceRoles = targetAudience === 'customer'
        ? ['customer']
        : targetAudience === 'salon'
        ? ['salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager']
        : null;
      const tu = audienceRoles
        ? await db.select({ phone: users.phone }).from(users).where(inArray(users.role as any, audienceRoles))
        : await db.select({ phone: users.phone }).from(users);
      for (const u of tu) {
        if (u.phone) {
          try {
            await sendMeliPayamakSms(u.phone, `${title}\n${content}`);
            sc++;
          } catch {}
        }
      }
    }

    res.status(200).json({ success: true, sentCount: sc });
  } catch (e: any) { res.status(500).json({ error: e?.message || 'خطا در ارسال پیامک.' }); }
});

router.patch('/notifications/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const patch: Record<string, any> = {};
    const { isActive, title, content, badgeText, displayPosition, targetPanels, type, targetAudience, channel, actionUrl, actionText, expiresAt } = req.body;
    if (typeof isActive === 'boolean') patch.isActive = isActive;
    if (typeof title === 'string') patch.title = title.trim();
    if (typeof content === 'string') patch.content = content.trim();
    if (typeof badgeText === 'string') patch.badgeText = badgeText.trim();
    if (typeof displayPosition === 'string') patch.displayPosition = displayPosition;
    if (typeof targetPanels === 'string') patch.targetPanels = targetPanels;
    if (typeof type === 'string') patch.type = type;
    if (typeof targetAudience === 'string') patch.targetAudience = targetAudience;
    if (typeof channel === 'string') patch.channel = channel;
    if (actionUrl !== undefined) patch.actionUrl = actionUrl ? String(actionUrl).trim() : null;
    if (actionText !== undefined) patch.actionText = actionText ? String(actionText).trim() : null;
    if (expiresAt !== undefined) patch.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const [updated] = await db.update(notifications).set(patch).where(eq(notifications.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'اعلان یافت نشد.' });
    res.json(updated);
  } catch (err: any) {
    console.error('[PATCH NOTIFICATIONS ERROR]', err);
    res.status(500).json({ error: 'خطا در به‌روزرسانی اعلان.' });
  }
});

router.delete('/notifications/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(notifications).where(eq(notifications.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE NOTIFICATIONS ERROR]', err);
    res.status(500).json({ error: 'خطا در حذف اعلان.' });
  }
});

router.post('/notifications/:id/view', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
    await db.update(notifications).set({ viewsCount: sql`${notifications.viewsCount} + 1` }).where(eq(notifications.id, id));
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

router.post('/notifications/:id/click', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid ID' });
    await db.update(notifications).set({ clicksCount: sql`${notifications.clicksCount} + 1` }).where(eq(notifications.id, id));
    res.json({ success: true });
  } catch {
    res.json({ success: false });
  }
});

// ==========================================
// Admin profile + line-manager staff
// ==========================================
router.get('/admin/profile', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
  try {
    const profile = await db.select().from(adminProfile).limit(1).then(r => r[0] || null);
    res.json(profile);
  } catch (err: any) {
    console.error('[GET ADMIN PROFILE ERROR]', err);
    res.status(500).json({ error: 'خطا در دریافت پروفایل مدیریت.' });
  }
});

router.patch('/admin/profile', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
  try {
    const data = schemas.adminProfileUpdateSchema.parse(req.body);
    const existing = await db.select().from(adminProfile).limit(1).then(r => r[0]);
    let result;
    if (!existing) {
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

router.get('/line-manager/staff', requireAuth, requireRole(['super_admin', 'line_manager']), async (req: AuthRequest, res) => {
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

// ==========================================
// Support tickets (N+1 fixed via batched message load)
// ==========================================
router.get('/tickets', requireAuth, async (req: AuthRequest, res) => {
  try {
    const list = req.dbUser.role === 'super_admin'
      ? await db.select().from(supportTickets).orderBy(desc(supportTickets.updatedAt))
      : await db.select().from(supportTickets).where(eq(supportTickets.userId, req.dbUser.id)).orderBy(desc(supportTickets.updatedAt));

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

router.post('/tickets', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { subject, category, priority, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'موضوع و متن الزامی است.' });
    const [t] = await db.insert(supportTickets).values({
      userId: req.dbUser.id, ticketCode: `TK-${crypto.randomInt(1000, 9999)}`,
      subject: String(subject).trim(), category: category || 'general', priority: priority || 'medium', status: 'open',
    }).returning();
    const [m] = await db.insert(ticketMessages).values({
      ticketId: t.id, senderId: req.dbUser.id, senderRole: req.dbUser.role, message: String(message).trim(),
    }).returning();
    res.status(201).json({ ...t, messages: [m] });
  } catch { res.status(500).json({ error: 'خطا در ایجاد تیکت.' }); }
});

router.post('/tickets/:id/messages', requireAuth, async (req: AuthRequest, res) => {
  try {
    const tid = Number(req.params.id), { message } = req.body;
    if (!message || !Number.isFinite(tid)) return res.status(400).json({ error: 'متن الزامی است.' });
    const t = await db.select().from(supportTickets).where(eq(supportTickets.id, tid)).limit(1).then(r => r[0]);
    if (!t) return res.status(404).json({ error: 'تیکت یافت نشد.' });
    if (req.dbUser.role !== 'super_admin' && t.userId !== req.dbUser.id) return res.status(403).json({ error: 'دسترسی ندارید.' });
    const [m] = await db.insert(ticketMessages).values({
      ticketId: tid, senderId: req.dbUser.id, senderRole: req.dbUser.role, message: String(message).trim(),
    }).returning();
    await db.update(supportTickets).set({ updatedAt: new Date(), status: req.dbUser.role === 'super_admin' ? 'in_progress' : 'open' }).where(eq(supportTickets.id, tid));
    res.status(201).json(m);
  } catch { res.status(500).json({ error: 'خطا در ارسال پیام.' }); }
});

router.patch('/tickets/:id/status', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
  try {
    const tid = Number(req.params.id), { status } = req.body;
    if (!status || !Number.isFinite(tid)) return res.status(400).json({ error: 'وضعیت الزامی است.' });
    res.json(await db.update(supportTickets).set({ status, updatedAt: new Date() }).where(eq(supportTickets.id, tid)).returning());
  } catch { res.status(500).json({ error: 'خطا در تغییر وضعیت.' }); }
});

export default router;
