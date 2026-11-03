import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './index.ts';

export async function runMigrations() {
  try {
    console.log('[DB MIGRATE] Running schema migrations from ./drizzle...');
    await migrate(db as any, { 
      migrationsFolder: './drizzle',
      migrationsSchema: 'public'
    });
    console.log('[DB MIGRATE] All migrations applied successfully.');
  } catch (err: any) {
    const msg = err?.message || String(err);
    
    // خطاهای غیرمهلک که می‌تونیم نادیده بگیریم:
    const nonFatalPatterns = [
      'already exists',      // migration قبلاً اعمال شده
      'duplicate key',       // دو بار insert شده
      'relation already',    // جدول از قبل هست
    ];
    
    const isNonFatal = nonFatalPatterns.some(p => msg.toLowerCase().includes(p));
    
    if (isNonFatal) {
      console.warn('[DB MIGRATE] Non-fatal (already applied):', msg);
      return;
    }
    
    // خطاهای جدی: connection، syntax، permission
    console.error('[DB MIGRATE FATAL]', msg);
    console.error('[DB MIGRATE] Cannot start with broken schema.');
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // ← در production اصلاً بالا نمی‌آد
    }
    throw err; // ← در development هم throw می‌کنه
  }
}
