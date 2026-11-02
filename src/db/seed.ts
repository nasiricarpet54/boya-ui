import { db } from './index.ts';
import { users, salons, services, specialists } from './schema.ts';
import { INITIAL_SALONS, INITIAL_USERS } from '../shared/data/marketplaceData.ts';
import { eq } from 'drizzle-orm';
import { normalizePhone } from '../shared/utils/persianUtils.ts';
import { sanitizeRole } from './users.ts';
import { loadServerData, saveServerData } from '../lib/serverDataStore.ts';

export async function seedDatabase() {
  console.log('[DB SEED] Starting database seeding & multi-tenant mapping...');

  const tenantSalonMap = new Map<string, number>();

  // 1. Seed Salons, Services & Specialists first to get numeric IDs
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
      }).returning().catch(err => {
        console.error('Seed salon insert error:', err);
        return [];
      });
      salonRecord = inserted[0];
    }

    if (!salonRecord) continue;
    tenantSalonMap.set(tenantId, salonRecord.id);

    // Seed Services for this salon
    for (const srv of s.services || []) {
      const existingService = await db.select().from(services)
        .where(eq(services.salonId, salonRecord.id))
        .then(rows => rows.find(r => r.name === srv.name || r.serviceLineId === srv.serviceLineId));

      if (!existingService) {
        await db.insert(services).values({
          salonId: salonRecord.id,
          serviceLineId: srv.serviceLineId || 'hair',
          name: srv.name,
          description: srv.description || null,
          price: String(srv.price || '300000'),
          durationMinutes: srv.durationMinutes || 45,
          isMobileAvailable: Boolean(srv.isMobileAvailable),
          imageUrl: srv.imageUrl || null,
        }).catch(err => console.error('Seed service error:', err));
      }
    }

    // Seed Specialists for this salon
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
        }).returning();
        spUser = createdUser;
      } else {
        // Ensure existing specialist user has the correct salonId integer set
        await db.update(users)
          .set({ salonId: salonRecord.id })
          .where(eq(users.id, spUser.id))
          .catch(err => console.error('Update specialist salonId error:', err));
      }

      if (spUser) {
        const existingSp = await db.select().from(specialists).where(eq(specialists.userId, spUser.id)).limit(1).then(r => r[0]);
        if (!existingSp) {
          await db.insert(specialists).values({
            userId: spUser.id,
            salonId: salonRecord.id,
            specialtyLine: sp.specialtyLine || 'hair',
            bio: sp.bio || 'متخصص زیبایی در سامانه بویا',
            experienceYears: sp.experienceYears || 3,
            isVerified: true,
            isMobileActive: Boolean(sp.isMobileSpecialist),
            avatarUrl: sp.avatar || null,
          }).catch(err => console.error('Seed specialist error:', err));
        }
      }
    }
  }

  // 2. Seed Users & enforce tenantId mapping to numeric salonId
  for (const u of INITIAL_USERS) {
    const cleanPhone = normalizePhone(u.phone);
    if (!cleanPhone) continue;

    const role = sanitizeRole(u.role);
    let resolvedSalonId: number | null = null;

    if (u.tenantId && tenantSalonMap.has(u.tenantId)) {
      resolvedSalonId = tenantSalonMap.get(u.tenantId)!;
    } else if (u.salonId && !isNaN(Number(u.salonId))) {
      resolvedSalonId = Number(u.salonId);
    }

    const existing = await db.select().from(users).where(eq(users.phone, cleanPhone)).limit(1).then(r => r[0]);

    if (!existing) {
      await db.insert(users).values({
        uid: `phone_${cleanPhone}`,
        phone: cleanPhone,
        fullName: u.name || u.fullName || `کاربر ${cleanPhone.slice(-4)}`,
        email: u.email || `${cleanPhone}@boya.ir`,
        role,
        salonId: resolvedSalonId,
      }).catch(err => console.error('Seed user error:', err));
    } else {
      // Fix missing or outdated salonId on existing user
      if (resolvedSalonId !== null && existing.salonId !== resolvedSalonId) {
        await db.update(users)
          .set({ salonId: resolvedSalonId, role })
          .where(eq(users.id, existing.id))
          .catch(err => console.error('Update user salonId error:', err));
      }
    }
  }

  // Ensure default super_admin exists
  const superAdmin = await db.select().from(users).where(eq(users.phone, '09123456789')).limit(1).then(r => r[0]);
  if (!superAdmin) {
    await db.insert(users).values({
      uid: 'super_admin_main',
      phone: '09123456789',
      fullName: 'مهندس حسینی (مدیر ارشد)',
      email: 'admin@boya.ir',
      role: 'super_admin',
      salonId: null,
    }).catch(err => console.error('Seed superadmin error:', err));
  }

  // 3. Sync serverData store with authoritative PostgreSQL database state
  try {
    const serverData = loadServerData();
    const allDbUsers = await db.select().from(users);

    for (const dbU of allDbUsers) {
      const idx = serverData.users.findIndex(u => normalizePhone(u.phone) === dbU.phone);
      if (idx >= 0) {
        serverData.users[idx] = {
          ...serverData.users[idx],
          id: dbU.id,
          fullName: dbU.fullName,
          phone: dbU.phone,
          email: dbU.email,
          role: dbU.role,
          salonId: dbU.salonId ? String(dbU.salonId) : null,
          status: dbU.status,
        };
      } else {
        serverData.users.push({
          id: dbU.id,
          uid: dbU.uid,
          fullName: dbU.fullName,
          phone: dbU.phone,
          email: dbU.email,
          role: dbU.role,
          salonId: dbU.salonId ? String(dbU.salonId) : null,
          status: dbU.status,
          createdAt: new Date().toISOString(),
        });
      }
    }

    saveServerData(serverData);
  } catch (err) {
    console.error('Error syncing serverData store during seed:', err);
  }

  console.log('[DB SEED] Seeding and multi-tenant mapping completed successfully!');
}
