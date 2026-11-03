import jwt from 'jsonwebtoken';
import crypto from 'crypto';

if (!process.env.JWT_SECRET) {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️ WARNING: JWT_SECRET environment variable is missing.');
  console.warn('\x1b[33m%s\x1b[0m', 'Generating a cryptographically secure random secret for this session.');
}

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

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
    const decoded = jwt.verify(token, JWT_SECRET!) as JwtUserPayload;
    return decoded;
  } catch {
    return null;
  }
}
