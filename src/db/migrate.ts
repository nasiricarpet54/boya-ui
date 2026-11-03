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
    console.warn('[DB MIGRATE NOTICE] Non-fatal migration notice:', err?.message || err);
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
