import pg from 'pg';
import { createHash } from 'node:crypto';

if (!process.env.DATABASE_URL) {
  console.log(JSON.stringify({ skipped: true, reason: 'DATABASE_URL is not configured' }));
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
const scope = process.env.INSTITUTION_ID || null;
try {
  const { rows } = await pool.query(`SELECT institution_id, actor_user_id, event_type, entity_type, entity_id, before_state, after_state, correlation_id, privacy_classification, previous_hash, event_hash, hash_version FROM audit_events WHERE hash_version IN (1,2) AND ($1::uuid IS NULL OR institution_id = $1::uuid) ORDER BY institution_id, created_at, id`, [scope]);
  let verified = 0;
  const lastByInstitution = new Map();
  for (const row of rows) {
    const previousHash = lastByInstitution.get(row.institution_id) || row.previous_hash;
    if (verified && row.previous_hash !== previousHash) throw new Error(`Audit chain link mismatch for institution ${row.institution_id}`);
    const canonical = { institutionId: row.institution_id, actorUserId: row.actor_user_id, eventType: row.event_type, entityType: row.entity_type, entityId: row.entity_id, beforeState: row.before_state || null, afterState: row.after_state || null, correlationId: row.correlation_id, ...(row.hash_version >= 2 ? { privacyClassification: row.privacy_classification } : {}), previousHash: row.previous_hash };
    const expected = createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
    if (expected !== row.event_hash) throw new Error(`Audit hash mismatch for institution ${row.institution_id}`);
    lastByInstitution.set(row.institution_id, row.event_hash);
    verified += 1;
  }
  console.log(JSON.stringify({ ok: true, verified, scope: scope || 'all-institutions', hashVersion: 1 }));
} finally {
  await pool.end();
}
