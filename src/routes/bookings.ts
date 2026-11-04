import { Router } from 'express';
import { db } from '../db/index.ts';
import { bookings as bookingsTable, services, specialists, salons, users } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { requireAuth, type AuthRequest } from '../middleware/auth.ts';
import * as schemas from '../lib/validation.ts';
import { createBooking, getBookingsForUser, updateBookingStatus } from '../db/bookings.ts';
import { sendMeliPayamakSms } from '../lib/meliPayamak.ts';
import { normalizeToIsoDate, normalizeTimeToLatin } from '../shared/utils/dateIsoConverter.ts';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const list = await getBookingsForUser(req.dbUser);
    const { processBookingData } = await import('../lib/piiRedactor.ts');
    res.json(list.map((b: any) => processBookingData(b, req.dbUser)));
  } catch (err: any) {
    res.status(err.message === 'FORBIDDEN_NO_SALON' ? 403 : 500).json({ error: 'خطا در دریافت نوبت‌ها.' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = schemas.bookingCreateSchema.parse(req.body);

    // AUDIT (P0): the server always charges the catalog price from the
    // services table, so a tampered request cannot book at another price.
    const serviceRow = await db.select().from(services).where(eq(services.id, Number(data.serviceId))).limit(1).then(r => r[0]);
    if (!serviceRow) return res.status(400).json({ error: 'خدمت یافت نشد.' });

    const booking = await createBooking({
      ...data,
      customerId: req.dbUser.id,
      price: String(serviceRow.price),
    } as any);

    await sendMeliPayamakSms(req.dbUser.phone, `نوبت ثبت شد. کد رهگیری: ${booking?.trackingCode}`).catch(() => {});
    res.status(201).json(booking);
  } catch (err: any) {
    console.error('[POST BOOKING ERROR]', err);
    res.status(400).json({ error: err.message || 'خطا در ثبت نوبت.' });
  }
});

router.patch('/:id/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const updated = await updateBookingStatus(id, req.body.status);
    res.json(updated);
  } catch (err) {
    console.error('[PATCH BOOKING STATUS ERROR]', err);
    res.status(500).json({ error: 'خطا در تغییر وضعیت.' });
  }
});

export default router;
