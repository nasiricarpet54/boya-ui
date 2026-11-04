import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './index.ts';

/**
 * P3: Migration failure handling.
 *
 * In production, a failed migration means the code and the schema have
 * diverged — serving requests against a half-migrated database can corrupt
 * data or return wrong results silently, so the server must refuse to start.
 *
 * In development we only warn, so a stale migration folder does not block
 * local iteration.
 */
export async function runMigrations() {
  const isProd = process.env.NODE_ENV === 'production';
  console.log('[DB MIGRATE] Running schema migrations from ./drizzle...');
  try {
    await migrate(db as any, {
      migrationsFolder: './drizzle',
      migrationsSchema: 'public',
    });
    console.log('[DB MIGRATE] All migrations applied successfully.');
  } catch (err: any) {
    if (isProd) {
      console.error('[DB MIGRATE FATAL] Schema migration failed in production. Refusing to serve requests against a possibly inconsistent database:', err);
      process.exit(1);
    }
    console.warn('[DB MIGRATE NOTICE] Non-fatal migration notice (dev only):', err?.message || err);
  }
}

if (process.argv[1]?.includes('migrate.ts')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[DB MIGRATE ERROR]', err);
      process.exit(1);
    });
}
