import type { Request, Response, NextFunction } from 'express';
import { getOrCreateUserByPhone } from '../db/users.ts';

export interface AuthRequest extends Request {
  dbUser?: any;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'خطای احراز هویت: توکن دریافت نشد' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const phone = token.startsWith('phone_') ? token.replace('phone_', '') : token;
    const dbUser = await getOrCreateUserByPhone(phone);
    if (!dbUser) {
      return res.status(401).json({ error: 'خطای احراز هویت: کاربر یافت نشد' });
    }
    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(401).json({ error: 'خطای احراز هویت: توکن نامعتبر است' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser || !roles.includes(req.dbUser.role)) {
      return res.status(403).json({ error: 'خطای سطح دسترسی: شما مجاز به انجام این عملیات نمی‌باشید' });
    }
    next();
  };
};
