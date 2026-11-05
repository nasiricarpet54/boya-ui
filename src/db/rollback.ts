/**
 * F-16: this script destructively drops columns that live migrations own
 * (publication_status backs the service/specialist review workflow). It ran
 * with no confirmation, so one wrong `npm run db:rollback` silently deleted
 * production state. It must be confirmed interactively before executing.
 */
import { db } from './index.ts';
import { sql } from 'drizzle-orm';

const TARGETS = [
  'salons.license_doc_url',
  'services.publication_status',
  'specialists.publication_status',
] as const;

async function rollbackLastMigration() {
  const confirmed = process.env.DB_ROLLBACK_CONFIRM === 'I_UNDERSTAND_THIS_IS_DESTRUCTIVE';
  if (!confirmed) {
    console.error(
      '[DB ROLLBACK] This command permanently drops: ' + TARGETS.join(', ') + '.\n' +
      'It does not ask again after the first row is deleted. To proceed, run with:\n' +
      'DB_ROLLBACK_CONFIRM=I_UNDERSTAND_THIS_IS_DESTRUCTIVE npm run db:rollback'
    );
    process.exit(1);
  }

  console.log('[DB ROLLBACK] Executing rollback operations...');
  try {
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
