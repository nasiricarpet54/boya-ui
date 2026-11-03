import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const isProd = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  if (isProd) {
    console.error('🔴 [FATAL] JWT_SECRET is not set in production!');
    console.error('   Set JWT_SECRET in .env.production or use --env-file.');
    console.error('   Refusing to start with a random secret (would invalidate all sessions on restart).');
    process.exit(1); // ← سرور در production اصلاً بالا نمی‌آد
  } else {
    console.warn('⚠️  [DEV] JWT_SECRET not set, using random secret for this session only.');
    console.warn('    All sessions will be invalidated on restart.');
  }
}

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = '7d'; // ← از 30 روز به 7 روز کاهش دادم (بهتره)

export interface JwtUserPayload {
  id: number;
  uid: string;
  phone: string;
  role: string;
  salonId?: string | null;
}

export function generateJwtToken(payload: JwtUserPayload): string {
  return jwt.sign(
    {
      id: payload.id,
      uid: payload.uid,
      phone: payload.phone,
      role: payload.role,
      salonId: payload.salonId || null,
    },
    JWT_SECRET!,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyJwtToken(token: string): JwtUserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as JwtUserPayload;
    return decoded;
  } catch {
    return null;
  }
}
