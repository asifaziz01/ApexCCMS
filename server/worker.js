import { databaseStatus, query, withTransaction } from './db.js';

const workerId = `ccms-worker-${process.pid}`;
const staleAfterSeconds = Math.min(86_400, Math.max(60, Number(process.env.JOB_STALE_AFTER_SECONDS || 900)));

export async function claimNextJob() {
  if (!databaseStatus().configured) return null;
  return withTransaction(async client => {
    await client.query(`UPDATE jobs SET status = 'Queued', started_at = NULL, last_error = COALESCE(last_error, 'Worker lease expired; job returned to queue') WHERE status = 'Processing' AND started_at < now() - make_interval(secs => $1) AND attempts < max_attempts`, [staleAfterSeconds]);
    const { rows } = await client.query(`SELECT id, institution_id, job_type AS type, payload, attempts, max_attempts AS "maxAttempts" FROM jobs WHERE status = 'Queued' AND attempts < max_attempts ORDER BY queued_at FOR UPDATE SKIP LOCKED LIMIT 1`);
    const job = rows[0];
    if (!job) return null;
    const { rows: updated } = await client.query(`UPDATE jobs SET status = 'Processing', attempts = attempts + 1, started_at = now(), last_error = NULL WHERE id = $1 RETURNING id, institution_id, job_type AS type, payload, attempts, max_attempts AS "maxAttempts"`, [job.id]);
    return { ...updated[0], workerId };
  });
}

export async function completeJob(id, institutionId) {
  return query(`UPDATE jobs SET status = 'Completed', completed_at = now() WHERE id = $1 AND institution_id = $2 AND status = 'Processing' RETURNING id`, [id, institutionId]);
}

export async function failJob(id, institutionId, errorMessage) {
  return query(`UPDATE jobs SET status = CASE WHEN attempts >= max_attempts THEN 'Dead-lettered' ELSE 'Queued' END, last_error = $3, started_at = CASE WHEN attempts >= max_attempts THEN started_at ELSE NULL END, completed_at = CASE WHEN attempts >= max_attempts THEN now() ELSE NULL END WHERE id = $1 AND institution_id = $2 AND status = 'Processing' RETURNING id, status`, [id, institutionId, String(errorMessage).slice(0, 2000)]);
}

export async function processJob(job) {
  if (job.type === 'evidence.retention') {
    await query(`UPDATE evidence_items SET status = 'Expired' WHERE institution_id = $1 AND retention_until IS NOT NULL AND retention_until < CURRENT_DATE AND status NOT IN ('Expired','Deleted')`, [job.institution_id || job.institutionId]);
    return;
  }
  throw new Error(`No handler registered for job type: ${job.type}`);
}

export async function runWorkerOnce(processJob = async () => {}) {
  const job = await claimNextJob();
  if (!job) return null;
  try {
    await processJob(job);
    await completeJob(job.id, job.institution_id);
    return { ...job, status: 'Completed' };
  } catch (error) {
    const { rows } = await failJob(job.id, job.institution_id, error.message);
    return { ...job, status: rows[0]?.status || 'Queued', lastError: error.message };
  }
}
