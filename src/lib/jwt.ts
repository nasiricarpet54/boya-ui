import jwt from 'jsonwebtoken';

const isProd = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'boya-beauty-jwt-secret-platform-2026-key-secure-v2-fallback';

if (isProd && !process.env.JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET is not defined in environment variables. Using internal fallback secret. This is not recommended for live production.');
}
const JWT_EXPIRES_IN = '30d';

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
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyJwtToken(token: string): JwtUserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && (decoded.phone || decoded.id)) {
      return {
        id: Number(decoded.id),
        uid: String(decoded.uid || ''),
        phone: String(decoded.phone || ''),
        role: String(decoded.role || 'customer'),
        salonId: decoded.salonId ? String(decoded.salonId) : null,
      };
    }
    return null;
  } catch {
    return null;
  }
}
