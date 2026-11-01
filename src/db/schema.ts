import { pgTable, serial, text, integer, timestamp, boolean, pgEnum, decimal, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', [
  'customer', 
  'salon_specialist', 
  'mobile_specialist', 
  'line_manager', 
  'salon_admin', 
  'super_admin'
]);

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending', 
  'confirmed', 
  'completed', 
  'cancelled', 
  'rescheduled'
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'unpaid', 
  'deposit_paid', 
  'fully_paid', 
  'refunded'
]);

// Tables
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase UID
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull().unique(),
  role: userRoleEnum('role').default('customer').notNull(),
  salonId: text('salon_id'), // For salon_admin, specialists, and line_manager
  managedLine: text('managed_line'), // For line_manager (e.g. 'hair', 'nail')
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const salons = pgTable('salons', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull().unique(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  province: text('province').notNull(),
  city: text('city').notNull(),
  district: text('district').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('5.00').notNull(),
  reviewsCount: integer('reviews_count').default(0).notNull(),
  isApproved: boolean('is_approved').default(false).notNull(),
  isVip: boolean('is_vip').default(false).notNull(),
  vipBadgeLabel: text('vip_badge_label'),
  isMobileServiceActive: boolean('is_mobile_service_active').default(false).notNull(),
  coverImage: text('cover_image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  salonId: integer('salon_id').references(() => salons.id).notNull(),
  serviceLineId: text('service_line_id').notNull(), // e.g. 'hair', 'nail'
  name: text('name').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 12, scale: 0 }).notNull(), // In Toman
  durationMinutes: integer('duration_minutes').notNull(),
  isMobileAvailable: boolean('is_mobile_available').default(false).notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const specialists = pgTable('specialists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  salonId: integer('salon_id').references(() => salons.id).notNull(),
  specialtyLine: text('specialty_line').notNull(),
  bio: text('bio'),
  experienceYears: integer('experience_years').default(0).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  isMobileActive: boolean('is_mobile_active').default(false).notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => users.id).notNull(),
  salonId: integer('salon_id').references(() => salons.id).notNull(),
  serviceId: integer('service_id').references(() => services.id).notNull(),
  specialistId: integer('specialist_id').references(() => specialists.id).notNull(),
  date: text('date').notNull(), // Format: YYYY-MM-DD
  time: text('time').notNull(), // Format: HH:MM
  status: bookingStatusEnum('status').default('pending').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').default('unpaid').notNull(),
  isMobileBooking: boolean('is_mobile_booking').default(false).notNull(),
  customerAddress: text('customer_address'),
  notes: text('notes'),
  trackingCode: text('tracking_code').notNull().unique(),
  price: decimal('price', { precision: 12, scale: 0 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Database-level lock for double booking prevention
  uniqueSpecialistSlot: unique('unique_specialist_slot').on(table.specialistId, table.date, table.time),
}));

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').references(() => bookings.id).notNull(),
  amount: decimal('amount', { precision: 12, scale: 0 }).notNull(),
  gatewayReference: text('gateway_reference'),
  status: text('status').notNull(), // e.g. 'success', 'failed'
  type: text('type').notNull(), // e.g. 'deposit', 'full'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const portfolioItems = pgTable('portfolio_items', {
  id: serial('id').primaryKey(),
  specialistId: integer('specialist_id').references(() => specialists.id).notNull(),
  title: text('title').notNull(),
  imageUrl: text('imageUrl').notNull(),
  category: text('category').notNull(),
  likesCount: integer('likes_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  bookings: many(bookings),
  specialistProfile: one(specialists, {
    fields: [users.id],
    references: [specialists.userId],
  }),
}));

export const salonsRelations = relations(salons, ({ many }) => ({
  services: many(services),
  specialists: many(specialists),
  bookings: many(bookings),
}));

export const specialistsRelations = relations(specialists, ({ one, many }) => ({
  user: one(users, {
    fields: [specialists.userId],
    references: [users.id],
  }),
  salon: one(salons, {
    fields: [specialists.salonId],
    references: [salons.id],
  }),
  bookings: many(bookings),
  portfolio: many(portfolioItems),
}));

export const portfolioItemsRelations = relations(portfolioItems, ({ one }) => ({
  specialist: one(specialists, {
    fields: [portfolioItems.specialistId],
    references: [specialists.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  customer: one(users, {
    fields: [bookings.customerId],
    references: [users.id],
  }),
  salon: one(salons, {
    fields: [bookings.salonId],
    references: [salons.id],
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
  specialist: one(specialists, {
    fields: [bookings.specialistId],
    references: [specialists.id],
  }),
  transactions: many(transactions),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  salon: one(salons, {
    fields: [services.salonId],
    references: [salons.id],
  }),
  bookings: many(bookings),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  booking: one(bookings, {
    fields: [transactions.bookingId],
    references: [bookings.id],
  }),
}));
