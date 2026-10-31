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

export async function getOrCreateUserByPhone(phone: string, fullName?: string) {
  try {
    const isAdminPhone = phone === '09123456789' || phone === '09120000000' || phone === '09121111111' || phone === '09122222222';
    const defaultRole = isAdminPhone ? 'super_admin' : 'customer';

    const existing = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (existing.length > 0) {
      const updates: any = {};
      if (fullName && existing[0].fullName !== fullName) updates.fullName = fullName;
      if (isAdminPhone && existing[0].role !== 'super_admin') updates.role = 'super_admin';

      if (Object.keys(updates).length > 0) {
        const updated = await db.update(users)
          .set(updates)
          .where(eq(users.id, existing[0].id))
          .returning();
        return updated[0];
      }
      return existing[0];
    }
    const result = await db.insert(users)
      .values({
        uid: `phone_${phone}`,
        phone,
        fullName: fullName || (isAdminPhone ? 'مهندس حسینی (ادمین کل)' : `کاربر ${phone.slice(-4)}`),
        email: `${phone}@boya.ir`,
        role: defaultRole,
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

