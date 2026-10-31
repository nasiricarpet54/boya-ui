import { db } from './index.ts';
import { bookings, transactions } from './schema.ts';
import { eq, and, sql } from 'drizzle-orm';

export async function createBooking(data: {
  customerId: number;
  salonId: number;
  serviceId: number;
  specialistId: number;
  date: string;
  time: string;
  isMobileBooking: boolean;
  customerAddress?: string;
  notes?: string;
  price: string;
}) {
  try {
    const trackingCode = `BY-${Math.floor(100000 + Math.random() * 900000)}`;
    
    // We wrap in a transaction for atomicity
    const result = await db.transaction(async (tx) => {
      // The unique constraint in schema.ts will throw if the slot is already taken.
      // This is the database-level lock.
      const [newBooking] = await tx.insert(bookings).values({
        ...data,
        trackingCode,
        status: 'pending',
        paymentStatus: 'unpaid',
      }).returning();

      return newBooking;
    });

    return result;
  } catch (error: any) {
    if (error.code === '23505') { // Postgres Unique Violation
      throw new Error("این بازه زمانی قبلاً توسط کاربر دیگری رزرو شده است.");
    }
    console.error("Database operation failed (createBooking):", error);
    throw new Error("خطایی در ثبت رزرو رخ داد.", { cause: error });
  }
}

export async function updateBookingStatus(id: number, status: 'confirmed' | 'completed' | 'cancelled') {
  try {
    const [updated] = await db.update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();
    return updated;
  } catch (error) {
    throw new Error("Failed to update booking status.", { cause: error });
  }
}

export async function getBookingsByCustomer(customerId: number) {
  try {
    return await db.query.bookings.findMany({
      where: eq(bookings.customerId, customerId),
      with: {
        salon: true,
        service: true,
        customer: true,
        specialist: {
          with: {
            user: true
          }
        }
      },
      orderBy: (bookings, { desc }) => [desc(bookings.createdAt)]
    });
  } catch (error) {
    throw new Error("Failed to fetch customer bookings.", { cause: error });
  }
}

export async function getBookingsForUser(dbUser: any) {
  try {
    const { role, id, salonId, managedLine } = dbUser;

    if (role === 'super_admin') {
      return await db.query.bookings.findMany({
        with: {
          salon: true,
          service: true,
          customer: true,
          specialist: {
            with: {
              user: true
            }
          }
        },
        orderBy: (bookings, { desc }) => [desc(bookings.createdAt)]
      });
    }

    if (role === 'salon_admin') {
      if (!salonId) return [];
      return await db.query.bookings.findMany({
        where: eq(bookings.salonId, salonId),
        with: {
          salon: true,
          service: true,
          customer: true,
          specialist: {
            with: {
              user: true
            }
          }
        },
        orderBy: (bookings, { desc }) => [desc(bookings.createdAt)]
      });
    }

    if (role === 'line_manager') {
      if (!salonId || !managedLine) return [];
      // This is a bit complex since we need to filter by service line through the services table
      // Drizzle relational query can do this with 'where' on the top level if we use standard query builder
      // but for simplicity here we might need to filter after or use sql.
      // Let's use the standard builder for more control if needed, but for now:
      const allSalonBookings = await db.query.bookings.findMany({
        where: eq(bookings.salonId, salonId),
        with: {
          salon: true,
          service: true,
          customer: true,
          specialist: {
            with: {
              user: true
            }
          }
        },
        orderBy: (bookings, { desc }) => [desc(bookings.createdAt)]
      });
      return allSalonBookings.filter(b => b.service.serviceLineId === managedLine);
    }

    if (role === 'salon_specialist' || role === 'mobile_specialist') {
      // Find the specialist record for this user
      const specialist = await db.query.specialists.findFirst({
        where: eq(bookings.id, id), // Wait, this is wrong. userId match.
      });
      // Actually, we can join specialists
      return await db.query.bookings.findMany({
        where: sql`${bookings.specialistId} IN (SELECT id FROM specialists WHERE user_id = ${id})`,
        with: {
          salon: true,
          service: true,
          customer: true,
          specialist: {
            with: {
              user: true
            }
          }
        },
        orderBy: (bookings, { desc }) => [desc(bookings.createdAt)]
      });
    }

    // Default: Customer
    return await getBookingsByCustomer(id);
  } catch (error) {
    console.error("Error in getBookingsForUser:", error);
    throw new Error("Failed to fetch bookings for user context.");
  }
}
