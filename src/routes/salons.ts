import { Router } from 'express';
import { db } from '../db/index.ts';
import { salons, services, specialists, bookings as bookingsTable } from '../db/schema.ts';
import { eq, and, inArray, ne } from 'drizzle-orm';
import { ZodError } from 'zod';
import crypto from 'crypto';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth.ts';
import * as schemas from '../lib/validation.ts';
import { sendMeliPayamakSms } from '../lib/meliPayamak.ts';
import {
  normalizeToIsoDate, normalizeTimeToLatin, toLatinDigits, toIsoDate,
  gregorianToJalali, JALALI_MONTHS, STANDARD_HOURLY_SLOTS,
} from '../shared/utils/dateIsoConverter.ts';

const router = Router();

// Public list with server-side location/service-line filters and real
// availability derived from the bookings table.
router.get('/', async (req, res) => {
  try {
    const { province, city, district, serviceLine, q } = req.query as Record<string, string | undefined>;

    const conditions = [eq(salons.isApproved, true)];
    if (province && province !== 'همه') conditions.push(eq(salons.province, province));
    if (city && city !== 'همه') conditions.push(eq(salons.city, city));
    if (district && district !== 'همه') conditions.push(eq(salons.district, district));

    const list = await db.query.salons.findMany({
      where: conditions.length === 1 ? conditions[0] : and(...conditions),
      with: { services: true, specialists: { with: { user: true, portfolio: true } } },
    });

    let result = list;
    if (q && q.trim()) {
      const needle = q.trim().toLowerCase();
      result = list.filter((s: any) =>
        s.name?.toLowerCase().includes(needle) ||
        s.city?.toLowerCase().includes(needle) ||
        s.district?.toLowerCase().includes(needle) ||
        s.services?.some((sv: any) => sv.name?.toLowerCase().includes(needle)) ||
        s.specialists?.some((sp: any) => sp.user?.fullName?.toLowerCase().includes(needle))
      );
    }
    if (serviceLine && serviceLine !== 'all') {
      result = result.filter((s: any) =>
        s.services?.some((sv: any) => sv.serviceLineId === serviceLine) ||
        s.specialists?.some((sp: any) => sp.specialtyLine === serviceLine)
      );
    }

    const salonIds = result.map((s: any) => s.id);
    if (salonIds.length > 0) {
      const upcomingBookings = await db.select().from(bookingsTable)
        .where(and(inArray(bookingsTable.salonId, salonIds), ne(bookingsTable.status, 'cancelled')))
        .limit(2000);

      const bookedByKey = new Set<string>();
      for (const b of upcomingBookings) {
        bookedByKey.add(`${b.salonId}|${normalizeToIsoDate(b.date) ?? ''}|${normalizeTimeToLatin(b.time) ?? ''}`);
      }

      result = result.map((s: any) => {
        const days: any[] = [];
        for (let i = 0; i < 30; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const iso = toIsoDate(d);
          const jalali = gregorianToJalali(d);
          const slots = STANDARD_HOURLY_SLOTS.map((time: string) => {
            const latin = normalizeTimeToLatin(toLatinDigits(time));
            const booked = latin ? bookedByKey.has(`${s.id}|${iso}|${latin}`) : false;
            return { time, booked };
          });
          days.push({
            date: `${jalali.jd} ${JALALI_MONTHS[jalali.jm - 1]}`,
            fullJalaliDate: `${jalali.jy}/${String(jalali.jm).padStart(2, '0')}/${String(jalali.jd).padStart(2, '0')}`,
            dayName: '', dayNumber: String(jalali.jd), rawDate: d, slots,
          });
        }
        return { ...s, availableSlots: days };
      });
    }

    res.json(result);
  } catch (err) {
    console.error('❌ API SALONS CRITICAL ERROR:', err);
    res.status(500).json({ error: 'خطا در دریافت لیست.' });
  }
});

router.get('/managed', requireAuth, requireRole(['super_admin', 'salon_admin', 'salon_specialist', 'mobile_specialist', 'line_manager']), async (req: AuthRequest, res) => {
  try {
    const salonId = req.dbUser.salonId;
    const rows = await db.query.salons.findMany({
      where: req.dbUser.role === 'super_admin' ? undefined : eq(salons.id, Number(salonId)),
      with: { services: true, specialists: { with: { user: true, portfolio: true } } },
    });
    res.json(rows);
  } catch (err) {
    console.error('❌ API MANAGED SALONS ERROR:', err);
    res.status(500).json({ error: 'خطا در دریافت لیست.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'شناسه سالن نامعتبر است.' });
    const salon = await db.query.salons.findFirst({
      where: eq(salons.id, id),
      with: { services: true, specialists: { with: { user: true, portfolio: true } } },
    });
    if (!salon) return res.status(404).json({ error: 'سالن یافت نشد.' });
    res.json(salon);
  } catch (err: any) {
    console.error('[GET SALON BY ID ERROR]', err);
    res.status(500).json({ error: 'خطا در دریافت اطلاعات سالن.' });
  }
});

router.patch('/:id', requireAuth, requireRole(['super_admin', 'salon_admin']), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const data = schemas.salonUpdateSchema.parse(req.body);

    // `gallery` is a TEXT column; the salon admin sends an array of URLs.
    const patch: Record<string, any> = { ...data };
    if (Array.isArray(patch.gallery)) patch.gallery = JSON.stringify(patch.gallery);
    delete patch.specialists;

    const [updated] = await db.update(salons).set(patch as any).where(eq(salons.id, id)).returning();
    res.json({ success: true, salon: updated });
  } catch (err) {
    console.error('[PATCH SALON ERROR]', err);
    res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش.' });
  }
});

router.post('/', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
  try {
    const data = schemas.salonCreateSchema.parse(req.body);
    const [created] = await db.insert(salons).values({ ...data, tenantId: `salon_${Date.now()}` } as any).returning();
    res.status(201).json(created);
  } catch (err) {
    console.error('[CREATE SALON ERROR]', err);
    res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ایجاد سالن.' });
  }
});

router.delete('/:id', requireAuth, requireRole(['super_admin']), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(salons).where(eq(salons.id, id));
    res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE SALON ERROR]', err);
    res.status(500).json({ error: 'خطا در حذف سالن.' });
  }
});

// Reviews: rolling average rating.
router.post('/:id/reviews', requireAuth, async (req: AuthRequest, res) => {
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
  } catch {
    res.status(500).json({ error: 'خطا در ثبت نظر.' });
  }
});

export default router;
