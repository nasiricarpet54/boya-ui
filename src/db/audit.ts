import { db } from './index.ts';
import { auditLogs } from './schema.ts';
import { redactLogValue } from '../lib/piiRedactor.ts';

export async function logSecurityAction(params: {
  actorId?: number;
  targetId?: string | number;
  action: 'LOGIN' | 'LOGOUT' | 'ROLE_CHANGE' | 'SUSPENSION' | 'DELETE_USER' | 'PASSWORD_CHANGE' | 'UNAUTHORIZED_ACCESS' | 'CREATE_USER';
  details?: any;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      actorId: params.actorId,
      targetId: params.targetId ? String(params.targetId) : null,
      action: params.action,
      details: params.details ? JSON.stringify(params.details) : null,
      ipAddress: params.ipAddress || '0.0.0.0',
    });
  } catch (err) {
    console.error('[AUDIT LOG ERROR]', redactLogValue(err));
  }
}
