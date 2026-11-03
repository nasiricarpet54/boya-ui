import { db } from './index.ts';
import { sql } from 'drizzle-orm';

async function rollbackLastMigration() {
  console.log('[DB ROLLBACK] Executing safe, idempotent rollback operations...');
  try {
    // Safely drop columns added in recent migrations if present
    await db.execute(sql`ALTER TABLE salons DROP COLUMN IF EXISTS license_doc_url;`);
    await db.execute(sql`ALTER TABLE services DROP COLUMN IF EXISTS publication_status;`);
    await db.execute(sql`ALTER TABLE specialists DROP COLUMN IF EXISTS publication_status;`);
    console.log('[DB ROLLBACK] Rollback completed successfully.');
  } catch (err) {
    console.error('[DB ROLLBACK ERROR]', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

rollbackLastMigration();
