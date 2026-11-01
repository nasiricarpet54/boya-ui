import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';
import { normalizePhone } from '../shared/utils/persianUtils.ts';

const VALID_ROLES = [
  'customer',
  'salon_specialist',
  'mobile_specialist',
  'line_manager',
  'salon_admin',
  'super_admin',
] as const;

export function sanitizeRole(roleInput: any): typeof VALID_ROLES[number] {
  if (!roleInput) return 'customer';
  const roleMap: Record<string, string> = {
    'salon_owner': 'salon_admin',
    'specialist': 'salon_specialist',
    'independent_specialist': 'line_manager',
  };
  const mapped = roleMap[roleInput] || String(roleInput).trim().toLowerCase();
  if (VALID_ROLES.includes(mapped as any)) {
    return mapped as any;
  }
  return 'customer';
}

export async function getOrCreateUser(uid: string, email: string, fullName: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        fullName,
        phone: '',
        role: 'customer',
        status: 'active',

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
    console.error('Database operation failed (getOrCreateUser):', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

/**
 * Retrieve user by phone number from primary PostgreSQL database with unique constraint
 * and onConflictDoUpdate to prevent race conditions (A-11).
 */
export async function getOrCreateUserByPhone(rawPhone: string, fullName?: string) {
  try {
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      throw new Error('شماره همراه معتبر نیست.');
    }

    const resolvedName = fullName && fullName.trim() ? fullName.trim() : `کاربر ${phone.slice(-4)}`;

    const [dbUser] = await db.insert(users)
      .values({
        uid: `phone_${phone}`,
        phone,
        fullName: resolvedName,
        email: `${phone}@boya.ir`,
        role: 'customer',
        status: 'active',

        salonId: null,
      })
      .onConflictDoUpdate({
        target: users.phone,
        set: {
          ...(fullName && fullName.trim() ? { fullName: fullName.trim() } : {}),
        },
      })
      .returning();

    return dbUser;
  } catch (error) {
    console.error('Database operation failed (getOrCreateUserByPhone):', error);
    throw new Error('خطا در ثبت یا بازیابی کاربر در پایگاه‌داده.', { cause: error });
  }
}

export async function getUserById(id: number) {
  try {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  } catch (error) {
    throw new Error('Failed to fetch user.', { cause: error });
  }
}
