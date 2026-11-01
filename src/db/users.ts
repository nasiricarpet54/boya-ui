import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, fullName: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        fullName,
        phone: '', // Will be updated later
        role: 'customer',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          fullName,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database operation failed (getOrCreateUser):", error);
    throw new Error("Failed to synchronize user profile.", { cause: error });
  }
}

import { normalizePhone } from '../shared/utils/persianUtils.ts';
import { loadServerData } from '../lib/serverDataStore.ts';

export async function getOrCreateUserByPhone(rawPhone: string, fullName?: string) {
  try {
    const phone = normalizePhone(rawPhone);
    const superAdminPhones = ['09123456789', '09120000000', '09121111111', '09122222222', '09145151435'];
    const isSuperAdminPhone = superAdminPhones.includes(phone);

    // 1. Check existing record in DB
    const existing = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (existing.length > 0) {
      const userRecord = existing[0];
      const updates: any = {};
      
      // Update name if different and provided
      if (fullName && fullName.trim() && userRecord.fullName !== fullName.trim()) {
        updates.fullName = fullName.trim();
      }
      
      // If super admin phone, ensure role is super_admin
      if (isSuperAdminPhone && userRecord.role !== 'super_admin') {
        updates.role = 'super_admin';
      }

      if (Object.keys(updates).length > 0) {
        const updated = await db.update(users)
          .set(updates)
          .where(eq(users.id, userRecord.id))
          .returning();
        return updated[0];
      }
      return userRecord;
    }

    // 2. If not in DB, check if user exists in serverData (configured by Admin in AdminUsersView)
    const serverData = loadServerData();
    const userInStore = serverData.users.find(u => normalizePhone(u.phone) === phone);
    
    let resolvedRole: any = 'customer';
    let resolvedName = fullName || `کاربر ${phone.slice(-4)}`;
    let resolvedSalonId: string | null = null;
    let resolvedEmail = `${phone}@boya.ir`;

    if (userInStore) {
      const roleMap: Record<string, string> = {
        'salon_owner': 'salon_admin',
        'specialist': 'salon_specialist',
        'independent_specialist': 'line_manager',
      };
      resolvedRole = roleMap[userInStore.role] || userInStore.role || 'customer';
      resolvedName = userInStore.fullName || userInStore.name || resolvedName;
      resolvedSalonId = userInStore.salonId ? String(userInStore.salonId) : null;
      resolvedEmail = userInStore.email || resolvedEmail;
    } else if (isSuperAdminPhone) {
      resolvedRole = 'super_admin';
      resolvedName = fullName || 'مدیر ارشد سامانه بویا';
    }

    // 3. Insert new user into PostgreSQL DB
    const result = await db.insert(users)
      .values({
        uid: `phone_${phone}`,
        phone,
        fullName: resolvedName,
        email: resolvedEmail,
        role: resolvedRole,
        salonId: resolvedSalonId,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database operation failed (getOrCreateUserByPhone):", error);
    throw new Error("Failed to synchronize phone user profile.", { cause: error });
  }
}

export async function getUserById(id: number) {
  try {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  } catch (error) {
    throw new Error("Failed to fetch user.", { cause: error });
  }
}

