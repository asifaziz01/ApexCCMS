import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const pool = connectionString ? new Pool({ connectionString, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000 }) : null;
if (pool) pool.on('error', error => console.error(JSON.stringify({ service: 'northern-star-ccms-api', event: 'database_pool_error', errorType: error.name || 'Error' })));

export function databaseStatus() {
  return { configured: Boolean(pool), mode: pool ? 'postgresql-ready' : 'in-memory-demo' };
}

export async function databaseReady() {
  if (!pool) return false;
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function query(text, values = []) {
  if (!pool) throw new Error('DATABASE_URL is not configured');
  return pool.query(text, values);
}

export async function withTransaction(work) {
  if (!pool) throw new Error('DATABASE_URL is not configured');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase() {
  if (pool) await pool.end();
}
