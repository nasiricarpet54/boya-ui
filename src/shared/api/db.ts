import { Pool } from 'pg';

export const createTestPool = () => {
  return new Pool({
    host: process.env.SQL_HOST || 'localhost',
    user: process.env.SQL_USER || 'postgres',
    password: process.env.SQL_PASSWORD || '',
    database: process.env.SQL_DB_NAME || 'boya_db',
    port: Number(process.env.SQL_PORT) || 5432,
    connectionTimeoutMillis: 10000,
  });
};

export interface DbTestResult {
  success: boolean;
  message: string;
  serverTime?: string;
  readTest?: boolean;
  writeTest?: boolean;
  error?: string;
}

/**
 * Tests database connection, read, and write operations against PostgreSQL.
 */
export async function testDatabaseConnection(): Promise<DbTestResult> {
  const pool = createTestPool();
  try {
    // 1. Test Connection & Read (SELECT NOW())
    const timeResult = await pool.query('SELECT NOW() as current_time');
    const serverTime = timeResult.rows[0]?.current_time;

    // 2. Test Read from Users table if exists
    let userCount = 0;
    try {
      const readResult = await pool.query('SELECT COUNT(*) as count FROM users');
      userCount = Number(readResult.rows[0]?.count || 0);
    } catch {
      // Users table might not be initialized yet
    }

    // 3. Test Write operation (create test log table & insert)
    let writeTest = false;
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS db_test_logs (
          id SERIAL PRIMARY KEY,
          checked_at TIMESTAMP DEFAULT NOW(),
          status VARCHAR(50)
        )`
      );
      await pool.query(`INSERT INTO db_test_logs (status) VALUES ($1)`, ['OK']);
      writeTest = true;
    } catch (writeErr) {
      console.warn('Write test table creation/insert note:', writeErr);
    }

    await pool.end();

    return {
      success: true,
      message: `اتصال به پایگاه‌داده PostgreSQL (Cloud SQL) موفقیت‌آمیز بود. تعداد کاربران: ${userCount}`,
      serverTime: serverTime ? serverTime.toString() : new Date().toISOString(),
      readTest: true,
      writeTest,
    };
  } catch (err: any) {
    try {
      await pool.end();
    } catch {}
    
    console.error('[DB TEST ERROR]', err);
    return {
      success: false,
      message: 'خطا در برقراری ارتباط با پایگاه‌داده PostgreSQL',
      error: err.message || String(err),
      readTest: false,
      writeTest: false,
    };
  }
}
