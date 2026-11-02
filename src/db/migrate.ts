import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !/^postgres(?:ql)?:\/\//.test(connectionString)) {
  console.error('DATABASE_URL must be an explicit PostgreSQL connection string.');
  process.exit(1);
}
const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
const migrations = ['0000_perfect_harrier.sql', '0001_publication_lifecycle.sql', '0002_persistent_customer_and_salon_data.sql'];
const statements = async (name: string) => (await fs.readFile(path.resolve('drizzle', name), 'utf8'))
  .split('--> statement-breakpoint').map((statement) => statement.trim()).filter(Boolean);

async function main() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(7139042026)');
    await client.query(`CREATE TABLE IF NOT EXISTS boya_migrations (
      name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    // Existing installations predate this ledger; baseline 0000 only when core schema is already present.
    const core = await client.query(`SELECT
      to_regclass('public.users') AS users,
      to_regclass('public.salons') AS salons,
      to_regclass('public.services') AS services,
      to_regclass('public.specialists') AS specialists,
      to_regclass('public.bookings') AS bookings`);
    const coreObjects = Object.values(core.rows[0] || {});
    if (coreObjects.some(Boolean) && !coreObjects.every(Boolean)) {
      throw new Error('Database has a partial core schema; refusing to guess whether baseline migration has already run.');
    }
    if (coreObjects.every(Boolean)) {
      await client.query('INSERT INTO boya_migrations(name) VALUES ($1) ON CONFLICT DO NOTHING', [migrations[0]]);
    }
    const lifecycle = await client.query(`SELECT
      to_regtype('public.publication_status') IS NOT NULL AS enum_exists,
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='services' AND column_name='publication_status') AS services_status,
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='specialists' AND column_name='publication_status') AS specialists_status,
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='salons' AND column_name='license_doc_url') AS license_doc`);
    if (Object.values(lifecycle.rows[0] || {}).every(Boolean)) {
      await client.query('INSERT INTO boya_migrations(name) VALUES ($1) ON CONFLICT DO NOTHING', [migrations[1]]);
    }
    for (const name of migrations) {
      const done = await client.query('SELECT 1 FROM boya_migrations WHERE name = $1', [name]);
      if (done.rowCount) continue;
      await client.query('BEGIN');
      try {
        for (const statement of await statements(name)) await client.query(statement);
        await client.query('INSERT INTO boya_migrations(name) VALUES ($1)', [name]);
        await client.query('COMMIT');
        console.log(`Applied migration ${name}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(7139042026)').catch(() => undefined);
    client.release();
    await pool.end();
  }
}
main().catch((error) => { console.error('Migration failed; no further migrations were applied.', error); process.exitCode = 1; });
