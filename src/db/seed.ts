import { db } from './index.ts';
import { users, salons, services, specialists, adminProfile } from './schema.ts';
import { INITIAL_SALONS, INITIAL_USERS } from '../shared/data/marketplaceData.ts';
import { eq } from 'drizzle-orm';
import { normalizePhone } from '../shared/utils/persianUtils.ts';
import { sanitizeRole } from './users.ts';

export async function seedDatabase() {
  console.log('[DB SEED] Starting database seeding process...');

  try {
    // 0. CHECK IF ALREADY SEEDED (Race Condition Mitigation)
    const superAdminExists = await db.select().from(users).where(eq(users.phone, '09123456789')).limit(1).then(r => r.length > 0);
    if (superAdminExists) {
      console.log('[DB SEED] Database already contains primary seed data. Skipping full re-seed.');
      return;
    }

    const tenantSalonMap = new Map<string, number>();

    // 1. Seed Salons, Services & Specialists
    for (const s of INITIAL_SALONS) {
      const tenantId = s.tenantId || String(s.id);
      let salonRecord = await db.select().from(salons).where(eq(salons.tenantId, tenantId)).limit(1).then(r => r[0]);

      if (!salonRecord) {
        const inserted = await db.insert(salons).values({
          tenantId,
          name: s.name,
          address: s.address || 'تهران',
          phone: s.phone || '02100000000',
          province: s.province || 'تهران',
          city: s.city || 'تهران',
          district: s.district || 'مرکز',
          latitude: s.latitude ? String(s.latitude) : '35.7000',
          longitude: s.longitude ? String(s.longitude) : '51.4000',
          rating: String(s.rating || '5.00'),
          reviewsCount: s.reviewsCount || 0,
          isApproved: true,
          isVip: Boolean(s.isVip),
          vipBadgeLabel: s.vipBadgeLabel || null,
          isMobileServiceActive: Boolean(s.isMobileServiceActive),
          coverImage: s.coverImage || null,
        }).returning();
        salonRecord = inserted[0];
      }

      if (!salonRecord) continue;
      tenantSalonMap.set(tenantId, salonRecord.id);

      // Seed Services
      for (const srv of s.services || []) {
        await db.insert(services).values({
          salonId: salonRecord.id,
          serviceLineId: srv.serviceLineId || 'hair',
          name: srv.name,
          description: srv.description || null,
          price: String(srv.price || '300000'),
          durationMinutes: srv.durationMinutes || 45,
          isMobileAvailable: Boolean(srv.isMobileAvailable),
          publicationStatus: 'active',
          imageUrl: srv.imageUrl || null,
        }).onConflictDoNothing();
      }

      // Seed Specialists
      for (const sp of s.specialists || []) {
        const spPhone = normalizePhone(sp.phone) || `0999${Math.floor(1000000 + Math.random() * 9000000)}`;
        let spUser = await db.select().from(users).where(eq(users.phone, spPhone)).limit(1).then(r => r[0]);
        if (!spUser) {
          const [createdUser] = await db.insert(users).values({
            uid: `phone_${spPhone}`,
            phone: spPhone,
            fullName: sp.name,
            email: `${spPhone}@boya.ir`,
            role: sp.isMobileSpecialist ? 'mobile_specialist' : 'salon_specialist',
            salonId: salonRecord.id,
            avatar: sp.avatar || null,
          }).returning();
          spUser = createdUser;
        }

        if (spUser) {
          await db.insert(specialists).values({
            userId: spUser.id,
            salonId: salonRecord.id,
            specialtyLine: sp.specialtyLine || 'hair',
            bio: sp.bio || 'متخصص زیبایی در سامانه بویا',
            experienceYears: sp.experienceYears || 3,
            isVerified: true,
            publicationStatus: 'active',
            isMobileActive: Boolean(sp.isMobileSpecialist),
            avatarUrl: sp.avatar || null,
          }).onConflictDoNothing();
        }
      }
    }

    // 2. Seed Users
    for (const u of INITIAL_USERS) {
      const cleanPhone = normalizePhone(u.phone);
      if (!cleanPhone) continue;

      let resolvedSalonId: number | null = null;
      if (u.tenantId && tenantSalonMap.has(u.tenantId)) {
        resolvedSalonId = tenantSalonMap.get(u.tenantId)!;
      }

      await db.insert(users).values({
        uid: `phone_${cleanPhone}`,
        phone: cleanPhone,
        fullName: u.name || u.fullName || `کاربر ${cleanPhone.slice(-4)}`,
        email: u.email || `${cleanPhone}@boya.ir`,
        role: sanitizeRole(u.role),
        salonId: resolvedSalonId,
      }).onConflictDoNothing();
    }

    // 3. Super Admin
    await db.insert(users).values({
      uid: 'super_admin_main',
      phone: '09123456789',
      fullName: 'مهندس حسینی (مدیر ارشد)',
      email: 'admin@boya.ir',
      role: 'super_admin',
    }).onConflictDoNothing();

    // 4. Admin Profile
    await db.insert(adminProfile).values({
      fullName: 'مهندس حسینی',
      phone: '09123456789',
      email: 'admin@boya.ir',
      positionTitle: 'مدیر ارشد پلتفرم و ناظر عالی کل بویا',
      adminCode: 'SA-1001',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    }).onConflictDoNothing();

    console.log('[DB SEED] Seeding completed successfully!');
  } catch (err) {
    console.error('[DB SEED CRITICAL ERROR]', err);
  }
}
