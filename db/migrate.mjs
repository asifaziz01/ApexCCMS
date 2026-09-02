import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDatabase, query, withTransaction } from '../server/db.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const migrationDir = path.join(root, 'migrations');

if (!process.env.DATABASE_URL) {
  console.error('Migration requires DATABASE_URL');
  process.exit(1);
}

try {
  await query(`CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const files = (await fs.readdir(migrationDir)).filter(file => /^\d+_.+\.sql$/.test(file)).sort();
  for (const file of files) {
    const version = file.split('_', 1)[0];
    const applied = await query('SELECT 1 FROM schema_migrations WHERE version = $1', [version]);
    if (applied.rowCount) continue;
    const sql = await fs.readFile(path.join(migrationDir, file), 'utf8');
    await withTransaction(async client => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING', [version]);
    });
    console.log(`Applied migration ${file}`);
  }
} finally {
  await closeDatabase();
}
