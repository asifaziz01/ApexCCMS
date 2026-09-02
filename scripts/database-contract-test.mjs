import pg from 'pg';

if (!process.env.DATABASE_URL) {
  console.log(JSON.stringify({ skipped: true, reason: 'DATABASE_URL is not configured' }));
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
try {
  const { rows } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)`, [['institutions', 'curriculum_versions', 'proposals', 'publications', 'evidence_items', 'audit_events', 'jobs']]);
  const actual = new Set(rows.map(row => row.table_name));
  const expected = ['institutions', 'curriculum_versions', 'proposals', 'publications', 'evidence_items', 'audit_events', 'jobs'];
  const missing = expected.filter(table => !actual.has(table));
  if (missing.length) throw new Error(`Missing tables: ${missing.join(', ')}`);
  const migration = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
  const appliedVersions = new Set(migration.rows.map(row => row.version));
  const requiredVersions = ['000', '001', '002', '003', '004', '005', '006', '007'];
  const missingVersions = requiredVersions.filter(version => !appliedVersions.has(version));
  if (missingVersions.length) throw new Error(`Missing migrations: ${missingVersions.join(', ')}`);
  const trigger = await pool.query(`SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = 'public' AND trigger_name = ANY($1)`, [['audit_events_immutable', 'publication_results_immutable']]);
  const triggerNames = new Set(trigger.rows.map(row => row.trigger_name));
  const requiredTriggers = ['audit_events_immutable', 'publication_results_immutable'];
  const missingTriggers = requiredTriggers.filter(name => !triggerNames.has(name));
  if (missingTriggers.length) throw new Error(`Missing immutability triggers: ${missingTriggers.join(', ')}`);
  const hashColumn = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_events' AND column_name IN ('hash_version','privacy_classification')`);
  if (hashColumn.rows.length !== 2) throw new Error('Missing audit hash/privacy columns');
  const privacyColumns = await pool.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND ((table_name = 'evidence_items' AND column_name = 'privacy_classification') OR (table_name = 'audit_events' AND column_name IN ('privacy_classification','hash_version')))`);
  if (privacyColumns.rows.length !== 3) throw new Error('Missing evidence/audit privacy columns');
  console.log(JSON.stringify({ ok: true, tables: expected.length, migrations: requiredVersions, immutabilityTriggers: requiredTriggers.length, auditVerifier: 'available', privacyClassification: 'available' }));
} finally {
  await pool.end();
}
