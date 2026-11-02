import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️ WARNING: JWT_SECRET environment variable is missing.');
  console.warn('\x1b[33m%s\x1b[0m', 'Using internal fallback secret.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'boya-beauty-fallback-secret-key-2026-secure-v3';

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
    JWT_SECRET!,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyJwtToken(token: string): JwtUserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as any;
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
  } catch (err) {
    return null;
  }
}
