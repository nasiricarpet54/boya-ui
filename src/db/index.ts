import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const rawConnString = process.env.DATABASE_URL || '';
    const isValidConnString = rawConnString.startsWith('postgresql://') || rawConnString.startsWith('postgres://');
    const connectionString = isValidConnString ? rawConnString : undefined;

    global._postgresPool = new Pool(connectionString ? {
      connectionString,
      max: 10,
      connectionTimeoutMillis: 15000,
    } : {
      host: process.env.SQL_HOST || '127.0.0.1',
      user: process.env.SQL_USER || 'postgres',
      password: process.env.SQL_PASSWORD || 'postgres',
      database: process.env.SQL_DB_NAME || 'boyadb',
      port: (process.env.SQL_PORT && !isNaN(Number(process.env.SQL_PORT))) ? Number(process.env.SQL_PORT) : 5432,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });
