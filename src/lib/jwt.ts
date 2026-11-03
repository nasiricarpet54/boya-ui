import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * JWT secret resolution.
 *
 * In production a missing JWT_SECRET is a hard failure: the server must not
 * start with a secret nobody configured, because every token minted would be
 * unverifiable after a restart and the operator would have no way to know the
 * secret was ever valid. In development we fall back to a random per-process
 * secret so a missing .env does not block local work.
 */
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
  ? (() => { throw new Error('JWT_SECRET environment variable is required in production. Set it in your environment and restart.'); })()
  : crypto.randomBytes(64).toString('hex'));

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️ WARNING: JWT_SECRET environment variable is missing.');
  console.warn('\x1b[33m%s\x1b[0m', 'Generating a cryptographically secure random secret for this dev session only.');
}

// Reduced from 30d to 7d: shorter-lived sessions limit the blast radius of a
// leaked token on a platform that handles payments.
const JWT_EXPIRES_IN = '7d';

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
    if (!decoded || (!decoded.phone && !decoded.id)) return null;
    return {
      id: Number(decoded.id),
      uid: String(decoded.uid || ''),
      phone: String(decoded.phone || ''),
      role: String(decoded.role || 'customer'),
      salonId: decoded.salonId ? String(decoded.salonId) : null,
    };
  } catch {
    return null;
  }
}
