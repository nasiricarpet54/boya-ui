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

export async function getUserById(id: number) {
  try {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  } catch (error) {
    throw new Error("Failed to fetch user.", { cause: error });
  }
}
