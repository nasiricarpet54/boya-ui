import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './index.ts';

export async function runMigrations() {
  console.log('[DB MIGRATE] Running schema migrations from ./drizzle...');
  await migrate(db as any, {
    migrationsFolder: './drizzle',
    migrationsSchema: 'public',
  });
  console.log('[DB MIGRATE] All migrations applied successfully.');
}

if (process.argv[1]?.includes('migrate.ts')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[DB MIGRATE ERROR] Migrations failed:', err);
      process.exit(1);
    });
}
