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
    const existing = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (existing.length > 0) {
      if (fullName && existing[0].fullName !== fullName) {
        const updated = await db.update(users)
          .set({ fullName })
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
        fullName: fullName || `کاربر ${phone.slice(-4)}`,
        email: `${phone}@boya.ir`,
        role: 'customer',
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

