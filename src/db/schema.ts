import { pgTable, serial, text, integer, timestamp, boolean, pgEnum, decimal, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', [
  'customer',
  'salon_specialist',
  'mobile_specialist',
  'line_manager',
  'salon_admin',
  'super_admin'
]);

// F-11: the admin dashboard has been sending { isApproved, status } since the
// validation pass that added `status` to salonUpdateSchema — but the column
// was never created, so every approve/reject from AdminDashboardView failed
// against the real table. Keep it simple: it mirrors isApproved rather than
// modelling a separate publication workflow.
export const salonStatusEnum = pgEnum('salon_status', ['active', 'pending', 'suspended']);

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

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'suspended'
]);

export const publicationStatusEnum = pgEnum('publication_status', [
  'pending',
  'approved',
  'active'
]);

// Tables
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase UID
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull().unique(),
  role: userRoleEnum('role').default('customer').notNull(),
  status: userStatusEnum('status').default('active').notNull(),
  salonId: integer('salon_id').references(() => salons.id, { onDelete: 'set null' }), // For salon_admin, specialists, and line_manager
  managedLine: text('managed_line'), // For line_manager (e.g. 'hair', 'nail')
  avatar: text('avatar'),
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
  // F-11: written by the admin approval flow; kept in sync with isApproved by
  // the PATCH handler so the two fields cannot disagree.
  status: salonStatusEnum('status').default('pending').notNull(),
  isVip: boolean('is_vip').default(false).notNull(),
  vipBadgeLabel: text('vip_badge_label'),
  isMobileServiceActive: boolean('is_mobile_service_active').default(false).notNull(),
  coverImage: text('cover_image'),
  gallery: text('gallery'),
  licenseDocUrl: text('license_doc_url'),
  ownerName: text('owner_name'),
  displayPriority: integer('display_priority').default(99).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  salonId: integer('salon_id').references(() => salons.id, { onDelete: 'cascade' }).notNull(),
  serviceLineId: text('service_line_id').notNull(), // e.g. 'hair', 'nail'
  name: text('name').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 12, scale: 0 }).notNull(), // In Toman
  durationMinutes: integer('duration_minutes').notNull(),
  isMobileAvailable: boolean('is_mobile_available').default(false).notNull(),
  imageUrl: text('image_url'),
  publicationStatus: publicationStatusEnum('publication_status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const specialists = pgTable('specialists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  salonId: integer('salon_id').references(() => salons.id, { onDelete: 'cascade' }).notNull(),
  specialtyLine: text('specialty_line').notNull(),
  bio: text('bio'),
  experienceYears: integer('experience_years').default(0).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  isMobileActive: boolean('is_mobile_active').default(false).notNull(),
  avatarUrl: text('avatar_url'),
  workingHours: text('working_hours'),
  workingDays: text('working_days'),
  publicationStatus: publicationStatusEnum('publication_status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  salonId: integer('salon_id').references(() => salons.id, { onDelete: 'cascade' }).notNull(),
  serviceId: integer('service_id').references(() => services.id, { onDelete: 'cascade' }).notNull(),
  specialistId: integer('specialist_id').references(() => specialists.id, { onDelete: 'cascade' }).notNull(),
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
  // Partial index to allow re-booking a slot if the previous booking was cancelled
  uniqueSpecialistSlot: uniqueIndex('unique_specialist_slot')
    .on(table.specialistId, table.date, table.time)
    .where(sql`status != 'cancelled'`),
}));

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').references(() => bookings.id, { onDelete: 'cascade' }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 0 }).notNull(),
  gatewayReference: text('gateway_reference'),
  status: text('status').notNull(), // e.g. 'success', 'failed'
  type: text('type').notNull(), // e.g. 'deposit', 'full'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const portfolioItems = pgTable('portfolio_items', {
  id: serial('id').primaryKey(),
  specialistId: integer('specialist_id').references(() => specialists.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  imageUrl: text('image_url').notNull(),
  category: text('category').notNull(),
  likesCount: integer('likes_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  salon: one(salons, {
    fields: [users.salonId],
    references: [salons.id],
  }),
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

export const servicesRelations = relations(services, ({ many, one }) => ({
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

export const revokedTokens = pgTable('revoked_tokens', {
  id: serial('id').primaryKey(),
  token: text('token').notNull().unique(),
  revokedAt: timestamp('revoked_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  type: text('type').default('promotional').notNull(), // 'promotional', 'informational', 'alert', 'discount'
  targetAudience: text('target_audience').default('all').notNull(), // 'customer', 'salon', 'all'
  channel: text('channel').default('in_app').notNull(), // 'in_app', 'sms', 'push', 'both'
  displayPosition: text('display_position').default('banner').notNull(), // 'banner', 'popup', 'toast', 'card'
  targetPanels: text('target_panels').default('all').notNull(), // 'all', 'customer', 'salon', 'admin'
  actionUrl: text('action_url'),
  actionText: text('action_text'),
  badgeText: text('badge_text'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  viewsCount: integer('views_count').default(0).notNull(),
  clicksCount: integer('clicks_count').default(0).notNull(),
});

export const adminProfile = pgTable('admin_profile', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  emergencyPhone: text('emergency_phone'),
  positionTitle: text('position_title'),
  adminCode: text('admin_code'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  province: text('province'),
  city: text('city'),
  securityAlertSms: boolean('security_alert_sms').default(true).notNull(),
  newSalonsNotifySms: boolean('new_salons_notify_sms').default(true).notNull(),
  weeklyReportsEmail: boolean('weekly_reports_email').default(true).notNull(),
  twoFactorEnabled: boolean('two_factor_enabled').default(true).notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorId: integer('actor_id').references(() => users.id, { onDelete: 'set null' }),
  targetId: text('target_id'), // User ID, Salon ID, or other entity ID
  action: text('action').notNull(), // 'LOGIN', 'ROLE_CHANGE', 'SUSPENSION', 'DELETE_USER', etc.
  details: text('details'), // JSON string with payload or context
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  ticketCode: text('ticket_code').notNull(),
  subject: text('subject').notNull(),
  category: text('category').default('general').notNull(),
  priority: text('priority').default('medium').notNull(),
  status: text('status').default('open').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const ticketMessages = pgTable('ticket_messages', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').references(() => supportTickets.id, { onDelete: 'cascade' }).notNull(),
  senderId: integer('sender_id').references(() => users.id, { onDelete: 'set null' }),
  senderRole: text('sender_role').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Refresh tokens for the JWT refresh-token pattern (P1).
// A refresh token is long-lived (30d), stored server-side, and rotation-aware:
// each login mints a new row, and logout/refresh deletes the old row.
export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
