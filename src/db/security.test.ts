import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBookingsForUser, createBooking } from './bookings';

const dbMock = vi.hoisted(() => ({
  query: {
    bookings: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  select: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('./index.ts', () => ({ db: dbMock }));

import { db as realDb } from './index.ts';
const db = realDb as unknown as typeof dbMock;

const eqValue = (condition: any): unknown => {
  const chunks = condition?.queryChunks ?? [];
  return chunks.find((chunk: any) => chunk?.constructor?.name === 'Param')?.value;
};

describe('booking visibility and tenant isolation', () => {
  afterEach(() => vi.clearAllMocks());

  it('limits a customer to their own bookings', async () => {
    db.query.bookings.findMany.mockResolvedValue([]);
    await getBookingsForUser({ id: 100, role: 'customer' });
    const where = db.query.bookings.findMany.mock.calls[0][0].where;
    expect(eqValue(where)).toBe(100);
  });

  it('limits salon admins to the assigned salon and rejects missing tenant identity', async () => {
    db.query.bookings.findMany.mockResolvedValue([]);
    await getBookingsForUser({ id: 1, role: 'salon_admin', salonId: 10 });
    expect(eqValue(db.query.bookings.findMany.mock.calls[0][0].where)).toBe(10);
    await expect(getBookingsForUser({ id: 1, role: 'salon_admin', salonId: null }))
      .rejects.toThrow('FORBIDDEN_NO_SALON');
    expect(db.query.bookings.findMany).toHaveBeenCalledTimes(1);
  });

  it('restricts specialists to bookings assigned to their user-linked specialist profile', async () => {
    db.query.bookings.findMany.mockResolvedValue([]);
    await getBookingsForUser({ id: 5, role: 'salon_specialist', salonId: 10 });
    const where = db.query.bookings.findMany.mock.calls[0][0].where;
    expect(where.queryChunks.some((chunk: any) => chunk?.constructor?.name === 'StringChunk' && chunk.value.join('').includes('specialists'))).toBe(true);
    expect(where.queryChunks).toContain(5);
  });
});

describe('booking relationship validation and persistence', () => {
  const base = {
    customerId: 3, salonId: 10, serviceId: 20, specialistId: 30,
    date: '2026-11-10', time: '11:30', isMobileBooking: false, price: 999,
  };

  function selectResults(...results: unknown[][]) {
    const chain = { where: vi.fn(), limit: vi.fn() };
    chain.where.mockReturnValue(chain);
    chain.limit.mockImplementation(() => Promise.resolve(results.shift() ?? []));
    db.select.mockReturnValue({ from: vi.fn().mockReturnValue(chain) });
    return chain;
  }

  it('rejects an unknown salon without attempting service lookup or insert', async () => {
    selectResults([]);
    await expect(createBooking(base)).rejects.toThrow('SALON_NOT_FOUND');
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('rejects a service belonging to another salon', async () => {
    selectResults([{ id: 10 }], []);
    await expect(createBooking(base)).rejects.toThrow('SERVICE_NOT_FOUND_IN_SALON');
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('rejects a specialist belonging to another salon', async () => {
    selectResults([{ id: 10 }], [{ id: 20, price: '1250' }], []);
    await expect(createBooking(base)).rejects.toThrow('SPECIALIST_NOT_FOUND_IN_SALON');
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('persists a valid booking using the catalog price rather than a client-supplied price', async () => {
    selectResults(
      [{ id: 10 }],
      [{ id: 20, salonId: 10, price: '1250' }],
      [{ id: 30, salonId: 10 }],
    );
    const booking = { id: 1, ...base, price: '1250', trackingCode: 'BY-123456' };
    const returning = vi.fn().mockResolvedValue([booking]);
    const values = vi.fn().mockReturnValue({ returning });
    db.insert.mockReturnValue({ values });
    db.query.bookings.findFirst.mockResolvedValue(booking);

    await expect(createBooking(base)).resolves.toEqual(booking);
    const inserted = values.mock.calls[0][0];
    expect(inserted).toMatchObject({
      customerId: 3, salonId: 10, serviceId: 20, specialistId: 30,
      status: 'pending', paymentStatus: 'unpaid', price: '1250',
    });
    expect(inserted.trackingCode).toMatch(/^BY-\d{6}$/);
  });

  it('propagates storage failures instead of returning a successful booking', async () => {
    selectResults([{ id: 10 }], [{ id: 20, salonId: 10, price: '1250' }], [{ id: 30, salonId: 10 }]);
    db.insert.mockImplementation(() => { throw new Error('database unavailable'); });
    await expect(createBooking(base)).rejects.toThrow('database unavailable');
  });
});
