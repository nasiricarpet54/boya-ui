import { Router } from 'express';
import { db } from '../db/index.ts';
import { users, revokedTokens, refreshTokens } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import crypto from 'crypto';
import { requireAuth, type AuthRequest } from '../middleware/auth.ts';
import { generateJwtToken, generateRefreshTokenValue, decodeTokenExpiry, REFRESH_TOKEN_EXPIRES_IN_MS } from '../lib/jwt.ts';
import { logSecurityAction } from '../db/audit.ts';
import * as schemas from '../lib/validation.ts';
import { normalizePhone } from '../shared/utils/persianUtils.ts';

const router = Router();
const isProd = process.env.NODE_ENV === 'production';

// OTP storage abstraction (Redis when configured, in-memory otherwise).
// Kept here because auth is the only consumer.
const memOtp = new Map<string, string>();
async function otpSet(k: string, v: any, ttl: number) {
  memOtp.set(k, JSON.stringify(v));
  setTimeout(() => memOtp.delete(k), ttl * 1000).unref?.();
}
async function otpGet(k: string) {
  return JSON.parse(memOtp.get(k) || 'null');
}
async function otpDel(k: string) {
  memOtp.delete(k);
}

router.post('/send-otp', async (req, res) => {
  try {
    const { phone: rawPhone } = req.body;
    const phone = schemas.phoneSchema.parse(normalizePhone(rawPhone));

    // Rate limit by phone number: max 3 requests per 5 minutes.
    const now = Date.now();
    const windowMs = 5 * 60 * 1000;
    const key = `otp:${phone}`;
    const bucket = (memOtp.get(key) as any) || { count: 0, firstAt: now };
    if (now - bucket.firstAt > windowMs) { bucket.count = 0; bucket.firstAt = now; }
    bucket.count++;
    memOtp.set(key, bucket as any);
    if (bucket.count > 3) {
      return res.status(429).json({ error: 'تعداد درخواست بیش از حد مجاز. چند دقیقه صبر کنید.' });
    }

    const otpCode = crypto.randomInt(10000, 99999).toString();
    await otpSet(phone, { code: otpCode, attempts: 0 }, 5 * 60);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[OTP LOG] ${phone} -> ${otpCode}`);
    }

    // SMS delivery is delegated to the provider; a failure is surfaced as 502.
    const { sendMeliPayamakSms } = await import('../lib/meliPayamak.ts');
    try {
      await sendMeliPayamakSms(phone, `کد تایید بویا: ${otpCode}`);
    } catch (e) {
      console.error('[SMS FAIL]', { phone, error: e });
      return res.status(502).json({ error: 'خطا در ارسال پیامک.' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در درخواست.' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const data = schemas.otpVerifySchema.parse({ ...req.body, phone: normalizePhone(req.body.phone) });
    const { phone, code, fullName } = data;

    const stored: any = await otpGet(phone);
    if (!stored) return res.status(400).json({ error: 'کد منقضی شده یا یافت نشد.' });

    if (stored.code !== code.trim()) {
      stored.attempts = (stored.attempts || 0) + 1;
      if (stored.attempts >= 3) {
        await otpDel(phone);
        return res.status(401).json({ error: 'تعداد تلاش‌ها زیاد شد. دوباره درخواست دهید.' });
      }
      await otpSet(phone, stored, 5 * 60);
      return res.status(400).json({ error: `کد اشتباه است. (${3 - stored.attempts} تلاش باقی مانده)` });
    }

    await otpDel(phone);

    let dbUser = await db.select().from(users).where(eq(users.phone, phone)).limit(1).then(r => r[0]);

    if (dbUser?.status === 'suspended') {
      await logSecurityAction({ action: 'UNAUTHORIZED_ACCESS', targetId: dbUser.id, details: { reason: 'Suspended login attempt' }, ipAddress: req.ip });
      return res.status(403).json({ error: 'حساب کاربری مسدود است.' });
    }

    if (!dbUser) {
      const [newUser] = await db.insert(users).values({
        uid: `phone_${phone}`,
        phone,
        fullName: fullName || `کاربر ${phone.slice(-4)}`,
        email: `${phone}@boya.ir`,
        role: 'customer',
      }).returning();
      dbUser = newUser;
    }

    await logSecurityAction({ actorId: dbUser.id, action: 'LOGIN', ipAddress: req.ip });

    const token = generateJwtToken({ id: dbUser.id, uid: dbUser.uid, phone: dbUser.phone, role: dbUser.role, salonId: dbUser.salonId ? String(dbUser.salonId) : null });
    const refreshTokenValue = generateRefreshTokenValue();

    await db.insert(refreshTokens).values({
      userId: dbUser.id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS),
    }).onConflictDoNothing().catch(() => {});

    res.cookie('token', token, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 15 * 60 * 1000, path: '/' });
    res.cookie('refreshToken', refreshTokenValue, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: REFRESH_TOKEN_EXPIRES_IN_MS, path: '/' });

    const { email: _, phone: __, ...safeUser } = dbUser;
    res.json({ user: safeUser });
  } catch (err: any) {
    console.error('[VERIFY-OTP ERROR]', err);
    res.status(err instanceof ZodError ? 400 : 500).json({ error: err.message || 'خطای احراز هویت.' });
  }
});

// P1: Exchange a valid refresh token for a fresh access token (rotation).
router.post('/refresh', async (req, res) => {
  try {
    const presented = req.cookies?.refreshToken || req.headers['x-refresh-token'];
    if (!presented || typeof presented !== 'string') {
      return res.status(401).json({ error: 'رفرش توکن یافت نشد. لطفاً دوباره وارد شوید.' });
    }

    const row = await db.select().from(refreshTokens).where(eq(refreshTokens.token, presented)).limit(1).then(r => r[0]);
    if (!row) return res.status(401).json({ error: 'رفرش توکن نامعتبر است.' });
    if (row.expiresAt.getTime() < Date.now()) {
      await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id)).catch(() => {});
      return res.status(401).json({ error: 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.' });
    }

    const dbUser = await db.select().from(users).where(eq(users.id, row.userId)).limit(1).then(r => r[0]);
    if (!dbUser || dbUser.status === 'suspended') {
      await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id)).catch(() => {});
      return res.status(403).json({ error: 'حساب کاربری مسدود است.' });
    }

    await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id));

    const newAccessToken = generateJwtToken({ id: dbUser.id, uid: dbUser.uid, phone: dbUser.phone, role: dbUser.role, salonId: dbUser.salonId ? String(dbUser.salonId) : null });
    const newRefreshValue = generateRefreshTokenValue();
    await db.insert(refreshTokens).values({
      userId: dbUser.id,
      token: newRefreshValue,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN_MS),
    }).onConflictDoNothing().catch(() => {});

    res.cookie('token', newAccessToken, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 15 * 60 * 1000, path: '/' });
    res.cookie('refreshToken', newRefreshValue, { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: REFRESH_TOKEN_EXPIRES_IN_MS, path: '/' });

    const { email: _, phone: __, ...safeUser } = dbUser;
    res.json({ user: safeUser });
  } catch (err: any) {
    console.error('[REFRESH ERROR]', err);
    res.status(500).json({ error: 'خطا در بازیابی نشست.' });
  }
});

router.post('/logout', requireAuth, async (req: AuthRequest, res) => {
  const token = req.cookies.token;
  if (token) {
    await db.insert(revokedTokens).values({ token, expiresAt: decodeTokenExpiry(token) }).onConflictDoNothing().catch(() => {});
  }
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken)).catch(() => {});
  }
  if (req.dbUser) {
    await logSecurityAction({ actorId: req.dbUser.id, action: 'LOGOUT', ipAddress: req.ip });
  }
  res.clearCookie('token', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' });
  res.clearCookie('refreshToken', { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' });
  res.json({ success: true });
});

router.get('/profile', requireAuth, (req: AuthRequest, res) => res.json(req.dbUser));

router.patch('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const allowed = schemas.userUpdateSchema.pick({ fullName: true, avatar: true, email: true }).parse(req.body);
    const [updated] = await db.update(users).set(allowed).where(eq(users.id, req.dbUser.id)).returning();
    if (allowed.avatar) {
      await db.update((await import('../db/schema.ts')).specialists).set({ avatarUrl: allowed.avatar }).where(eq((await import('../db/schema.ts')).specialists.userId, req.dbUser.id)).catch(() => {});
    }
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(err instanceof ZodError ? 400 : 500).json({ error: 'خطا در ویرایش پروفایل.' });
  }
});

export default router;
