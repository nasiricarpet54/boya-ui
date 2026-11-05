/**
 * Single OTP store + rate limiter for every entry point (web + mobile).
 *
 * F-03/F-05: this codebase previously had three OTP implementations — the
 * Redis-backed one in server.ts, an in-memory one in src/routes/auth.ts whose
 * rate-limit bucket and OTP record shared a key (so the limiter never worked),
 * and another in-memory one in src/routes/mobile.ts with no rate limit at all,
 * despite a comment claiming one. Unauthenticated SMS dispatch is billable, so
 * the rate limit is not optional.
 *
 * Storage: Redis when REDIS_URL is configured (survives restart, shared across
 * instances); an in-memory Map otherwise. Namespaces are separate so the rate
 * counter can never clobber the OTP record.
 */
import Redis from 'ioredis';

const redisClient: Redis | null = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
if (redisClient) {
  redisClient.on('error', (e) => console.error('[REDIS ERROR]', e.message));
}

const memOtp = new Map<string, string>();
const memRate = new Map<string, { count: number; firstAt: number }>();

const WINDOW_MS = 5 * 60 * 1000;
const OTP_TTL_SEC = 5 * 60;
const MAX_SENDS_PER_WINDOW = 3;

export async function otpSet(k: string, v: any, ttl = OTP_TTL_SEC): Promise<void> {
  if (redisClient) await redisClient.setex(`otp:${k}`, ttl, JSON.stringify(v));
  else memOtp.set(k, JSON.stringify(v));
}

export async function otpGet(k: string): Promise<any> {
  if (redisClient) return JSON.parse((await redisClient.get(`otp:${k}`)) || 'null');
  return JSON.parse(memOtp.get(k) || 'null');
}

export async function otpDel(k: string): Promise<void> {
  if (redisClient) await redisClient.del(`otp:${k}`);
  else memOtp.delete(k);
}

/**
 * True when the caller has already sent MAX_SENDS_PER_WINDOW codes within the
 * window. Uses its own `rate:` namespace — never the OTP record itself.
 */
export async function otpRateLimited(k: string): Promise<boolean> {
  if (redisClient) {
    const count = await redisClient.incr(`rate:${k}`);
    if (count === 1) await redisClient.expire(`rate:${k}`, OTP_TTL_SEC);
    return count > MAX_SENDS_PER_WINDOW;
  }
  const now = Date.now();
  const bucket = memRate.get(k) || { count: 0, firstAt: now };
  if (now - bucket.firstAt > WINDOW_MS) { bucket.count = 0; bucket.firstAt = now; }
  bucket.count++;
  memRate.set(k, bucket);
  return bucket.count > MAX_SENDS_PER_WINDOW;
}
