import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const isProd = process.env.NODE_ENV === 'production';

let jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  if (isProd) {
    console.error('🚨 [CRITICAL SECURITY ERROR] JWT_SECRET environment variable is missing in production! Fail-fast termination.');
    process.exit(1);
  } else {
    console.warn('⚠️ [DEV WARNING] JWT_SECRET not set in environment. Generating an ephemeral random secret for development.');
    jwtSecret = crypto.randomBytes(64).toString('hex');
  }
}

const JWT_SECRET: string = jwtSecret;
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
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyJwtToken(token: string): JwtUserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
    return decoded;
  } catch {
    return null;
  }
}
