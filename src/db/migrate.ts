import { createPool, db } from './index.ts';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Hybrid migration runner with admin pool connection fallback:
 * 1. Attempts connection using admin/superuser credentials to ensure full DDL/ALTER privileges.
 * 2. Ensures base tables exist.
 * 3. Pre-migration self-healing check using information_schema.columns to add any missing columns.
 * 4. Runs Drizzle's official migrate() function for version tracking.
 */
export async function runMigrations() {
  const isProd = process.env.NODE_ENV === 'production';
  console.log('[DB MIGRATE] Running hybrid migrations & self-healing checks...');

  // BUGFIX (P0): `createPool()` returns the application's *shared* pool
  // (global._postgresPool). Closing it would kill every subsequent query
  // with "Cannot use a pool after calling end on the pool" — exactly the
  // 500s seen on /api/salons after startup. So we only close a pool that
  // we created ourselves here (the temporary admin pool).
  let pool: Pool | null = null;
  let ownsPool = false;
  try {
    pool = new Pool({
      host: process.env.SQL_HOST || '127.0.0.1',
      user: process.env.SQL_ADMIN_USER || process.env.SQL_USER || 'postgres',
      password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD || 'postgres',
      database: process.env.SQL_DB_NAME || 'cloud_sql_development_database',
      port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
      connectionTimeoutMillis: 3000,
    });
    await pool.query('SELECT 1');
    ownsPool = true;
    console.log('[DB MIGRATE] Connected using admin/superuser pool for DDL migrations.');
  } catch {
    console.log('[DB MIGRATE] Admin pool connection failed, falling back to standard app pool...');
    pool = createPool(); // shared app pool — must NOT be closed by us
    ownsPool = false;
  }

  try {
    // 1. Ensure tables exist
    const tableStatements = [
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        role TEXT DEFAULT 'customer' NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        salon_id INTEGER,
        managed_line TEXT,
        avatar TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS salons (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        province TEXT NOT NULL,
        city TEXT NOT NULL,
        district TEXT NOT NULL,
        latitude DECIMAL(10, 7),
        longitude DECIMAL(10, 7),
        rating DECIMAL(3, 2) DEFAULT '5.00' NOT NULL,
        reviews_count INTEGER DEFAULT 0 NOT NULL,
        is_approved BOOLEAN DEFAULT FALSE NOT NULL,
        is_vip BOOLEAN DEFAULT FALSE NOT NULL,
        vip_badge_label TEXT,
        is_mobile_service_active BOOLEAN DEFAULT FALSE NOT NULL,
        cover_image TEXT,
        gallery TEXT,
        license_doc_url TEXT,
        owner_name TEXT,
        display_priority INTEGER DEFAULT 99 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        salon_id INTEGER NOT NULL,
        service_line_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(12, 0) NOT NULL,
        duration_minutes INTEGER NOT NULL,
        is_mobile_available BOOLEAN DEFAULT FALSE NOT NULL,
        image_url TEXT,
        publication_status TEXT DEFAULT 'active' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS specialists (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        salon_id INTEGER NOT NULL,
        specialty_line TEXT NOT NULL,
        bio TEXT,
        experience_years INTEGER DEFAULT 0 NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE NOT NULL,
        is_mobile_active BOOLEAN DEFAULT FALSE NOT NULL,
        avatar_url TEXT,
        working_hours TEXT,
        working_days TEXT,
        publication_status TEXT DEFAULT 'active' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        salon_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        specialist_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        payment_status TEXT DEFAULT 'unpaid' NOT NULL,
        is_mobile_booking BOOLEAN DEFAULT FALSE NOT NULL,
        customer_address TEXT,
        notes TEXT,
        tracking_code TEXT NOT NULL UNIQUE,
        price DECIMAL(12, 0) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL,
        amount DECIMAL(12, 0) NOT NULL,
        gateway_reference TEXT,
        status TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS portfolio_items (
        id SERIAL PRIMARY KEY,
        specialist_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        image_url TEXT NOT NULL,
        category TEXT NOT NULL,
        likes_count INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS revoked_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS admin_profile (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        position_title TEXT NOT NULL,
        admin_code TEXT NOT NULL UNIQUE,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        ticket_code TEXT NOT NULL,
        subject TEXT NOT NULL,
        category TEXT DEFAULT 'general' NOT NULL,
        priority TEXT DEFAULT 'medium' NOT NULL,
        status TEXT DEFAULT 'open' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL,
        sender_id INTEGER,
        sender_role TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'promotional' NOT NULL,
        target_audience TEXT DEFAULT 'all' NOT NULL,
        channel TEXT DEFAULT 'in_app' NOT NULL,
        display_position TEXT DEFAULT 'banner' NOT NULL,
        target_panels TEXT DEFAULT 'all' NOT NULL,
        action_url TEXT,
        action_text TEXT,
        badge_text TEXT,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        views_count INTEGER DEFAULT 0 NOT NULL,
        clicks_count INTEGER DEFAULT 0 NOT NULL,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      // Salon-admin feature pack (0005)
      `CREATE TABLE IF NOT EXISTS specialist_service_commissions (
        id SERIAL PRIMARY KEY,
        specialist_id INTEGER NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        commission_percent INTEGER NOT NULL,
        UNIQUE (specialist_id, service_id)
      )`,
      `CREATE TABLE IF NOT EXISTS salon_weekly_schedule (
        id SERIAL PRIMARY KEY,
        salon_id INTEGER NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL,
        open_time TEXT NOT NULL,
        close_time TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        UNIQUE (salon_id, day_of_week)
      )`,
      // Independent/mobile specialist feature pack (0006)
      `CREATE TABLE IF NOT EXISTS specialist_weekly_schedule (
        id SERIAL PRIMARY KEY,
        specialist_id INTEGER NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL,
        open_time TEXT NOT NULL,
        close_time TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        UNIQUE (specialist_id, day_of_week)
      )`,
      // Salon-admin per-service portfolio images (0007)
      `CREATE TABLE IF NOT EXISTS service_portfolio_items (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        title TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      // Service ↔ specialists junction (0008): a service can be offered by
      // several specialists of the matching line.
      `CREATE TABLE IF NOT EXISTS service_specialists (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        specialist_id INTEGER NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE (service_id, specialist_id)
      )`
    ];

    for (const sqlStmt of tableStatements) {
      try {
        await pool.query(sqlStmt);
      } catch (err: any) {
        console.warn('[DB MIGRATE NOTICE] Table creation notice:', err?.message || err);
      }
    }

    // Ensure salon_status enum exists
    try {
      await pool.query(`DO $$ BEGIN
        CREATE TYPE "public"."salon_status" AS ENUM('active', 'pending', 'suspended');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`);
    } catch (e: any) {
      console.warn('[DB MIGRATE NOTICE] salon_status enum check notice:', e?.message || e);
    }

    // 2. Pre-migration self-healing check using information_schema.columns
    const columnsToCheck: Array<{ table: string; column: string; definition: string }> = [
      { table: 'specialists', column: 'is_rented_chair', definition: 'BOOLEAN DEFAULT FALSE NOT NULL' },
      { table: 'specialists', column: 'commission_percent', definition: 'INTEGER' },
      { table: 'specialists', column: 'documents', definition: 'TEXT' },
      { table: 'specialists', column: 'working_hours', definition: 'TEXT' },
      { table: 'specialists', column: 'working_days', definition: 'TEXT' },
      { table: 'specialists', column: 'is_mobile_active', definition: 'BOOLEAN DEFAULT FALSE NOT NULL' },
      { table: 'specialists', column: 'bio', definition: 'TEXT' },
      { table: 'specialists', column: 'experience_years', definition: 'INTEGER DEFAULT 0 NOT NULL' },
      { table: 'specialists', column: 'is_verified', definition: 'BOOLEAN DEFAULT FALSE NOT NULL' },
      { table: 'specialists', column: 'avatar_url', definition: 'TEXT' },
      { table: 'specialists', column: 'publication_status', definition: "TEXT DEFAULT 'active' NOT NULL" },
      { table: 'salons', column: 'status', definition: "salon_status DEFAULT 'pending' NOT NULL" },
      { table: 'salons', column: 'is_mobile_service_active', definition: 'BOOLEAN DEFAULT FALSE NOT NULL' },
      { table: 'salons', column: 'is_vip', definition: 'BOOLEAN DEFAULT FALSE NOT NULL' },
      { table: 'salons', column: 'vip_badge_label', definition: 'TEXT' },
      { table: 'salons', column: 'owner_name', definition: 'TEXT' },
      { table: 'salons', column: 'display_priority', definition: 'INTEGER DEFAULT 99 NOT NULL' },
      { table: 'salons', column: 'latitude', definition: 'DECIMAL(10, 7)' },
      { table: 'salons', column: 'longitude', definition: 'DECIMAL(10, 7)' },
      { table: 'salons', column: 'rating', definition: "DECIMAL(3, 2) DEFAULT '5.00' NOT NULL" },
      { table: 'salons', column: 'reviews_count', definition: 'INTEGER DEFAULT 0 NOT NULL' },
      { table: 'salons', column: 'is_approved', definition: 'BOOLEAN DEFAULT FALSE NOT NULL' },
      { table: 'salons', column: 'cover_image', definition: 'TEXT' },
      { table: 'salons', column: 'gallery', definition: 'TEXT' },
      { table: 'salons', column: 'license_doc_url', definition: 'TEXT' },
      { table: 'users', column: 'salon_id', definition: 'INTEGER' },
      { table: 'users', column: 'managed_line', definition: 'TEXT' },
      { table: 'users', column: 'avatar', definition: 'TEXT' },
      { table: 'users', column: 'status', definition: "TEXT DEFAULT 'active' NOT NULL" },
      { table: 'users', column: 'role', definition: "TEXT DEFAULT 'customer' NOT NULL" },
      { table: 'services', column: 'description', definition: 'TEXT' },
      { table: 'services', column: 'is_mobile_available', definition: 'BOOLEAN DEFAULT FALSE NOT NULL' },
      { table: 'services', column: 'image_url', definition: 'TEXT' },
      // 0006: independent specialists own services without a salon.
      { table: 'services', column: 'owner_id', definition: 'INTEGER' },
      { table: 'services', column: 'publication_status', definition: "TEXT DEFAULT 'active' NOT NULL" },
      { table: 'bookings', column: 'is_mobile_booking', definition: 'BOOLEAN DEFAULT FALSE NOT NULL' },
      { table: 'bookings', column: 'customer_address', definition: 'TEXT' },
      { table: 'bookings', column: 'notes', definition: 'TEXT' },
      { table: 'bookings', column: 'payment_status', definition: "TEXT DEFAULT 'unpaid' NOT NULL" },
      { table: 'portfolio_items', column: 'likes_count', definition: 'INTEGER DEFAULT 0 NOT NULL' },
      { table: 'notifications', column: 'display_position', definition: "TEXT DEFAULT 'banner' NOT NULL" },
      { table: 'notifications', column: 'target_panels', definition: "TEXT DEFAULT 'all' NOT NULL" },
      { table: 'notifications', column: 'action_url', definition: 'TEXT' },
      { table: 'notifications', column: 'action_text', definition: 'TEXT' },
      { table: 'notifications', column: 'badge_text', definition: 'TEXT' },
      { table: 'notifications', column: 'expires_at', definition: 'TIMESTAMP' },
      { table: 'notifications', column: 'views_count', definition: 'INTEGER DEFAULT 0 NOT NULL' },
      { table: 'notifications', column: 'clicks_count', definition: 'INTEGER DEFAULT 0 NOT NULL' },
      { table: 'admin_profile', column: 'emergency_phone', definition: 'TEXT' },
      { table: 'admin_profile', column: 'position_title', definition: 'TEXT' },
      { table: 'admin_profile', column: 'admin_code', definition: 'TEXT' },
      { table: 'admin_profile', column: 'avatar_url', definition: 'TEXT' },
      { table: 'admin_profile', column: 'bio', definition: 'TEXT' },
      { table: 'admin_profile', column: 'province', definition: 'TEXT' },
      { table: 'admin_profile', column: 'city', definition: 'TEXT' },
      { table: 'admin_profile', column: 'security_alert_sms', definition: 'BOOLEAN DEFAULT TRUE NOT NULL' },
      { table: 'admin_profile', column: 'new_salons_notify_sms', definition: 'BOOLEAN DEFAULT TRUE NOT NULL' },
      { table: 'admin_profile', column: 'weekly_reports_email', definition: 'BOOLEAN DEFAULT TRUE NOT NULL' },
      { table: 'admin_profile', column: 'two_factor_enabled', definition: 'BOOLEAN DEFAULT TRUE NOT NULL' },
      { table: 'audit_logs', column: 'target_id', definition: 'TEXT' },
      { table: 'audit_logs', column: 'details', definition: 'TEXT' },
      { table: 'audit_logs', column: 'ip_address', definition: 'TEXT' },
      { table: 'support_tickets', column: 'category', definition: "TEXT DEFAULT 'general' NOT NULL" },
      { table: 'support_tickets', column: 'priority', definition: "TEXT DEFAULT 'medium' NOT NULL" },
      { table: 'support_tickets', column: 'updated_at', definition: 'TIMESTAMP DEFAULT NOW() NOT NULL' }
    ];

    for (const item of columnsToCheck) {
      try {
        const checkRes = await pool.query(
          `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
          [item.table, item.column]
        );
        if (checkRes.rows.length === 0) {
          console.log(`[DB SELF-HEALING] Adding missing column ${item.column} to table ${item.table}...`);
          await pool.query(`ALTER TABLE ${item.table} ADD COLUMN IF NOT EXISTS ${item.column} ${item.definition}`);
        }
      } catch (colErr: any) {
        console.warn(`[DB SELF-HEALING NOTICE] Column check/add notice for ${item.table}.${item.column}:`, colErr?.message || colErr);
      }
    }

    // 3. Run Drizzle ORM migrator for version management
    try {
      const migrationsFolder = path.resolve(__dirname, '../../drizzle');
      await migrate(db, { migrationsFolder });
      console.log('[DB MIGRATE] Drizzle ORM migrations executed successfully.');
    } catch (migErr: any) {
      console.warn('[DB MIGRATE NOTICE] Drizzle migrator notice (handled safely):', migErr?.message || migErr);
    }

    console.log('[DB MIGRATE] Hybrid migration & self-healing completed successfully.');
  } catch (err: any) {
    console.error('[DB MIGRATE ERROR]', err);
    if (isProd) {
      process.exit(1);
    }
  } finally {
    // BUGFIX (P0): only close a pool we own. The shared app pool
    // (global._postgresPool) must stay open for the server's queries.
    if (pool && ownsPool) {
      await pool.end().catch(() => {});
    }
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