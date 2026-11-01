import { db } from './index.ts';
import { bookings, salons, services, specialists, users } from './schema.ts';
import { eq, sql } from 'drizzle-orm';
import { normalizeToIsoDate } from '../shared/utils/dateIsoConverter.ts';

export async function createBooking(data: {
  customerId: number;
  salonId: number | string;
  serviceId: number | string;
  specialistId: number | string;
  date: string;
  time: string;
  isMobileBooking: boolean;
  customerAddress?: string;
  notes?: string;
  price: string | number;
}) {
  try {
    const trackingCode = `BY-${Math.floor(100000 + Math.random() * 900000)}`;
    const isoDate = normalizeToIsoDate(data.date);

    // 1. Resolve Salon ID
    let resolvedSalonId = Number(data.salonId);
    if (isNaN(resolvedSalonId)) {
      const s = await db.select().from(salons)
        .where(eq(salons.tenantId, String(data.salonId)))
        .limit(1)
        .then(r => r[0]);
      if (s) {
        resolvedSalonId = s.id;
      } else {
        // Fallback to first salon
        const firstSalon = await db.select().from(salons).limit(1).then(r => r[0]);
        resolvedSalonId = firstSalon ? firstSalon.id : 1;
      }
    }

    // 2. Resolve Service ID & Fetch authoritative price from DB (B-07 fix)
    let resolvedServiceId = Number(data.serviceId);
    let srvRecord: any = null;
    if (isNaN(resolvedServiceId)) {
      srvRecord = await db.select().from(services)
        .where(eq(services.salonId, resolvedSalonId))
        .limit(1)
        .then(r => r[0]);
      if (srvRecord) {
        resolvedServiceId = srvRecord.id;
      } else {
        srvRecord = await db.select().from(services).limit(1).then(r => r[0]);
        resolvedServiceId = srvRecord ? srvRecord.id : 1;
      }
    } else {
      srvRecord = await db.select().from(services).where(eq(services.id, resolvedServiceId)).limit(1).then(r => r[0]);
    }

    // 3. Resolve Specialist ID
    let resolvedSpecialistId = Number(data.specialistId);
    if (isNaN(resolvedSpecialistId)) {
      const sp = await db.select().from(specialists)
        .where(eq(specialists.salonId, resolvedSalonId))
        .limit(1)
        .then(r => r[0]);
      if (sp) {
        resolvedSpecialistId = sp.id;
      } else {
        const anySp = await db.select().from(specialists).limit(1).then(r => r[0]);
        resolvedSpecialistId = anySp ? anySp.id : 1;
      }
    }

    const cleanPrice = srvRecord ? String(srvRecord.price) : String(Number(data.price) || 350000);

    // Insert booking into PostgreSQL database
    const [newBooking] = await db.insert(bookings).values({
      customerId: data.customerId,
      salonId: resolvedSalonId,
      serviceId: resolvedServiceId,
      specialistId: resolvedSpecialistId,
      date: isoDate,
      time: data.time || '۱۱:۳۰',
      status: 'pending',
      paymentStatus: 'unpaid',
      isMobileBooking: Boolean(data.isMobileBooking),
      customerAddress: data.customerAddress || null,
      notes: data.notes || null,
      trackingCode,
      price: cleanPrice,
    }).returning();

    // Query enriched booking details
    const fullBooking = await db.query.bookings.findFirst({
      where: eq(bookings.id, newBooking.id),
      with: {
        salon: true,
        service: true,
        specialist: {
          with: {
            user: true,
          },
        },
        customer: true,
      },
    });

    return formatBookingResponse(fullBooking || newBooking);
  } catch (error: any) {
    if (error.code === '23505') {
      throw new Error('این بازه زمانی قبلاً توسط کاربر دیگری رزرو شده است.');
    }
    console.error('Database operation failed (createBooking):', error);
    throw new Error('خطایی در ثبت رزرو در پایگاه‌داده رخ داد.', { cause: error });
  }
}

export async function updateBookingStatus(id: number, status: 'pending' | 'confirmed' | 'completed' | 'cancelled') {
  try {
    const [updated] = await db.update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();

    const fullBooking = await db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: {
        salon: true,
        service: true,
        specialist: {
          with: {
            user: true,
          },
        },
        customer: true,
      },
    });

    return formatBookingResponse(fullBooking || updated);
  } catch (error) {
    throw new Error('Failed to update booking status.', { cause: error });
  }
}

export async function getBookingsForUser(dbUser: any) {
  try {
    const { role, id, salonId, managedLine } = dbUser;

    let dbBookings: any[] = [];

    if (role === 'super_admin') {
      dbBookings = await db.query.bookings.findMany({
        with: {
          salon: true,
          service: true,
          customer: true,
          specialist: {
            with: {
              user: true,
            },
          },
        },
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });
    } else if (role === 'salon_admin') {
      // Resolve numeric salonId if salonId is string or tenantId
      let sid = Number(salonId);
      if (isNaN(sid) && salonId) {
        const s = await db.select().from(salons).where(eq(salons.tenantId, String(salonId))).limit(1).then(r => r[0]);
        if (s) sid = s.id;
      }

      dbBookings = await db.query.bookings.findMany({
        where: sid ? eq(bookings.salonId, sid) : undefined,
        with: {
          salon: true,
          service: true,
          customer: true,
          specialist: {
            with: {
              user: true,
            },
          },
        },
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });
    } else if (role === 'salon_specialist' || role === 'mobile_specialist') {
      dbBookings = await db.query.bookings.findMany({
        where: sql`${bookings.specialistId} IN (SELECT id FROM specialists WHERE user_id = ${id})`,
        with: {
          salon: true,
          service: true,
          customer: true,
          specialist: {
            with: {
              user: true,
            },
          },
        },
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });
    } else if (role === 'line_manager') {
      let sid = Number(salonId);
      if (isNaN(sid) && salonId) {
        const s = await db.select().from(salons).where(eq(salons.tenantId, String(salonId))).limit(1).then(r => r[0]);
        if (s) sid = s.id;
      }
      const rawList = await db.query.bookings.findMany({
        where: sid ? eq(bookings.salonId, sid) : undefined,
        with: {
          salon: true,
          service: true,
          customer: true,
          specialist: {
            with: {
              user: true,
            },
          },
        },
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });
      dbBookings = managedLine ? rawList.filter(b => b.service?.serviceLineId === managedLine) : rawList;
    } else {
      // Customer: strictly their own bookings
      dbBookings = await db.query.bookings.findMany({
        where: eq(bookings.customerId, id),
        with: {
          salon: true,
          service: true,
          customer: true,
          specialist: {
            with: {
              user: true,
            },
          },
        },
        orderBy: (table, { desc }) => [desc(table.createdAt)],
      });
    }

    return dbBookings.map(formatBookingResponse);
  } catch (error) {
    console.error('Error in getBookingsForUser:', error);
    throw new Error('Failed to fetch bookings for user context.');
  }
}

function formatBookingResponse(b: any) {
  if (!b) return null;
  return {
    id: String(b.id),
    trackingCode: b.trackingCode || `BY-${b.id}`,
    salonId: String(b.salonId),
    salonName: b.salon?.name || 'سالن زیبایی بویا',
    salonAddress: b.salon?.address || 'تهران',
    serviceId: String(b.serviceId),
    serviceName: b.service?.name || 'خدمت زیبایی',
    serviceLineId: b.service?.serviceLineId || 'hair',
    specialistId: String(b.specialistId),
    specialistName: b.specialist?.user?.fullName || 'متخصص بویا',
    customerId: b.customerId,
    customerName: b.customer?.fullName || 'کاربر بویا',
    customerPhone: b.customer?.phone || '',
    date: b.date, // Gregorian ISO YYYY-MM-DD
    time: b.time,
    status: b.status,
    paymentStatus: b.paymentStatus,
    price: Number(b.price) || 0,
    isMobileBooking: Boolean(b.isMobileBooking),
    customerAddress: b.customerAddress || '',
    notes: b.notes || '',
    createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
  };
}
