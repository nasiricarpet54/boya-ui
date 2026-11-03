import { db } from './index.ts';
import { bookings, salons, services, specialists, users } from './schema.ts';
import { eq, sql, and } from 'drizzle-orm';
import { normalizeToIsoDate, normalizeTime } from '../shared/utils/dateIsoConverter.ts';
import crypto from 'crypto';

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
    // SECURITY: Use cryptographically secure random integers for tracking codes
    const randomSuffix = crypto.randomInt(100000, 999999);
    const trackingCode = `BY-${randomSuffix}`;
    
    const isoDate = normalizeToIsoDate(data.date);
    const isoTime = normalizeTime(data.time);

    // 1. Resolve Salon ID (Strict - No fallbacks)
    let resolvedSalonId = Number(data.salonId);
    if (isNaN(resolvedSalonId)) {
      const s = await db.select().from(salons)
        .where(eq(salons.tenantId, String(data.salonId)))
        .limit(1)
        .then(r => r[0]);
      if (!s) throw new Error('SALON_NOT_FOUND');
      resolvedSalonId = s.id;
    } else {
      const s = await db.select().from(salons).where(eq(salons.id, resolvedSalonId)).limit(1).then(r => r[0]);
      if (!s) throw new Error('SALON_NOT_FOUND');
    }

    // 2. Resolve Service ID & Validate ownership (Strict)
    const resolvedServiceId = Number(data.serviceId);
    if (isNaN(resolvedServiceId)) throw new Error('INVALID_SERVICE_ID');
    
    const srvRecord = await db.select().from(services)
      .where(and(eq(services.id, resolvedServiceId), eq(services.salonId, resolvedSalonId)))
      .limit(1)
      .then(r => r[0]);
    
    if (!srvRecord) throw new Error('SERVICE_NOT_FOUND_IN_SALON');

    // 3. Resolve Specialist ID & Validate ownership (Strict)
    const resolvedSpecialistId = Number(data.specialistId);
    if (isNaN(resolvedSpecialistId)) throw new Error('INVALID_SPECIALIST_ID');
    
    const spRecord = await db.select().from(specialists)
      .where(and(eq(specialists.id, resolvedSpecialistId), eq(specialists.salonId, resolvedSalonId)))
      .limit(1)
      .then(r => r[0]);
    
    if (!spRecord) throw new Error('SPECIALIST_NOT_FOUND_IN_SALON');

    const cleanPrice = String(srvRecord.price);

    // Insert booking into PostgreSQL database
    const [newBooking] = await db.insert(bookings).values({
      customerId: data.customerId,
      salonId: resolvedSalonId,
      serviceId: resolvedServiceId,
      specialistId: resolvedSpecialistId,
      date: isoDate,
      time: isoTime,
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
      },
    });

    return fullBooking;
  } catch (error) {
    console.error('Create booking failed:', error);
    throw error;
  }
}

import { processBookingData } from '../lib/piiRedactor.ts';

export async function getBookingsForUser(user: any) {
  const { id, role, salonId, managedLine } = user;
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
  } else if (role === 'customer') {
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
  } else if (role === 'salon_admin') {
    let sid = Number(salonId);
    if ((isNaN(sid) || !sid) && salonId) {
      const s = await db.select().from(salons).where(eq(salons.tenantId, String(salonId))).limit(1).then(r => r[0]);
      if (s) sid = s.id;
    }

    // CRITICAL MULTI-TENANT GUARD: If salon_admin has NO valid assigned salon, return 403!
    if (!sid || isNaN(sid)) {
      throw new Error('FORBIDDEN_NO_SALON');
    }

    dbBookings = await db.query.bookings.findMany({
      where: eq(bookings.salonId, sid),
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
    if ((isNaN(sid) || !sid) && salonId) {
      const s = await db.select().from(salons).where(eq(salons.tenantId, String(salonId))).limit(1).then(r => r[0]);
      if (s) sid = s.id;
    }

    if (!sid || isNaN(sid)) {
      throw new Error('FORBIDDEN_NO_SALON');
    }

    const rawList = await db.query.bookings.findMany({
      where: eq(bookings.salonId, sid),
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
  }

  // PII REDACTION: Process each booking to hide sensitive customer data
  return dbBookings.map(b => processBookingData(b, user));
}

export async function updateBookingStatus(bookingId: number, status: any) {
  const [updated] = await db.update(bookings)
    .set({ status })
    .where(eq(bookings.id, bookingId))
    .returning();

  if (!updated) return null;

  return db.query.bookings.findFirst({
    where: eq(bookings.id, updated.id),
    with: {
      salon: true,
      service: true,
      specialist: {
        with: {
          user: true,
        },
      },
    },
  });
}
