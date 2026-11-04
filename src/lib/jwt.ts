import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * JWT secret resolution.
 *
 * The secret must come from the environment (`.env`, docker -e, or the
 * platform's secret manager) — never from a hard-coded value in the source,
 * because this repository is public and a hard-coded secret would let anyone
 * forge a token for any user, including super_admin.
 *
 * P1: In production a missing JWT_SECRET is a hard failure. The previous
 * behavior (a deterministic fallback secret in source) would have deployed
 * cleanly but allowed full token forgery. In development we fall back to a
 * random per-process secret so a missing .env does not block local work.
 */
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

// P1: Access tokens are now short-lived (15m). A leaked access token is only
// useful for minutes, not days. Refresh tokens (30d) rotate on every use.
export const ACCESS_TOKEN_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_EXPIRES_IN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
}

export function verifyJwtToken(token: string): JwtUserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;
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

/**
 * P1: Opaque refresh tokens. Unlike the JWT, these are not verifiable offline
 * — they are random strings whose validity lives only in the database, so a
 * leaked refresh token is useless without DB access and can be revoked
 * instantly by deleting its row.
 */
export function generateRefreshTokenValue(): string {
  return crypto.randomBytes(48).toString('base64url');
}

/**
 * Decode a token's expiry without verifying it. Used by logout to record the
 * correct revocation window for the blacklist table.
 */
export function decodeTokenExpiry(token: string): Date {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (decoded?.exp) return new Date(decoded.exp * 1000);
  } catch { /* ignore */ }
  // Fall back to the access-token lifetime if the token is malformed.
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS);
}
