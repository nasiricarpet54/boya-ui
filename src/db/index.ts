import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const rawConnString = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : '';
    const hasDatabaseUrl = Boolean(rawConnString && (rawConnString.startsWith('postgresql://') || rawConnString.startsWith('postgres://')));

    if (hasDatabaseUrl) {
      try {
        const parsedUrl = new URL(rawConnString);
        console.log(`[DB POOL] Initializing PostgreSQL connection using DATABASE_URL: host=${parsedUrl.hostname}, port=${parsedUrl.port || '5432'}, db=${parsedUrl.pathname.replace(/^\//, '')}, user=${parsedUrl.username}`);
      } catch {
        console.log('[DB POOL] Initializing PostgreSQL connection using DATABASE_URL (direct connection string)');
      }

      global._postgresPool = new Pool({
        connectionString: rawConnString,
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    } else {
      const host = process.env.SQL_HOST || '127.0.0.1';
      const user = process.env.SQL_USER || 'postgres';
      const database = process.env.SQL_DB_NAME || 'boyadb';
      const port = (process.env.SQL_PORT && !isNaN(Number(process.env.SQL_PORT))) ? Number(process.env.SQL_PORT) : 5432;

      console.log(`[DB POOL] DATABASE_URL not set or invalid. Falling back to connection params: host=${host}, port=${port}, db=${database}, user=${user}`);

      global._postgresPool = new Pool({
        host,
        user,
        password: process.env.SQL_PASSWORD || 'postgres',
        database,
        port,
        max: 10,
        connectionTimeoutMillis: 15000,
      });
    }

    global._postgresPool.on('error', (err) => {
      console.warn('[DB POOL NOTICE] Idle SQL pool client connection closed or reset (non-fatal):', err?.message || err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });

