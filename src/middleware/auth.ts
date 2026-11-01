import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { verifyJwtToken } from '../lib/jwt.ts';
import { loadServerData } from '../lib/serverDataStore.ts';
import { normalizePhone } from '../shared/utils/persianUtils.ts';

export interface AuthRequest extends Request {
  dbUser?: any;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let token: string | undefined = req.cookies?.token;

  const authHeader = req.headers.authorization;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1]?.trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'خطای احراز هویت: لطفاً ابتدا وارد حساب کاربری خود شوید.' });
  }

  try {
    // 1. Check JWT verification
    const jwtPayload = verifyJwtToken(token);
    if (jwtPayload) {
      let dbUser: any = null;
      if (jwtPayload.phone) {
        dbUser = await db.select().from(users).where(eq(users.phone, jwtPayload.phone)).limit(1).then(r => r[0]);
      }
      if (!dbUser && jwtPayload.id) {
        dbUser = await db.select().from(users).where(eq(users.id, jwtPayload.id)).limit(1).then(r => r[0]);
      }
      if (dbUser) {
        // A-09: Check if user account is suspended via serverData store
        const serverData = loadServerData();
        const userInStore = serverData.users.find((u: any) => normalizePhone(u.phone) === normalizePhone(dbUser.phone));
        if (userInStore && userInStore.status === 'suspended') {
          return res.status(403).json({ error: 'حساب کاربری شما توسط مدیریت مسدود (Suspended) شده است.' });
        }
        req.dbUser = dbUser;
        return next();
      }
    }

    return res.status(401).json({ error: 'خطای احراز هویت: توکن نامعتبر یا منقضی شده است.' });
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(401).json({ error: 'خطای احراز هویت: اعتبار سنجی ناموفق بود.' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'خطای احراز هویت: ابتدا وارد حساب کاربری خود شوید.' });
    }

    const serverData = loadServerData();
    const userInStore = serverData.users.find((u: any) => normalizePhone(u.phone) === normalizePhone(req.dbUser.phone));
    if (userInStore && userInStore.status === 'suspended') {
      return res.status(403).json({ error: 'حساب کاربری شما مسدود شده است.' });
    }
    
    // Super admin has global unrestricted privileges
    if (req.dbUser.role === 'super_admin') {
      return next();
    }

    if (!allowedRoles.includes(req.dbUser.role)) {
      return res.status(403).json({ error: 'خطای سطح دسترسی: شما مجاز به انجام این عملیات نمی‌باشید.' });
    }
    next();
  };
};
