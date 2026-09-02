import { randomUUID } from 'node:crypto';
import { databaseStatus, query } from './db.js';

const jobs = new Map();
const maxAttempts = 3;

export async function enqueueJob({ type, payload = {}, actor = 'USR-000001', idempotencyKey = null, institutionId }) {
  if (databaseStatus().configured) {
    const { rows } = await query(`INSERT INTO jobs (id, institution_id, job_type, payload, actor_user_id, idempotency_key) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (institution_id, job_type, idempotency_key) DO UPDATE SET id = jobs.id RETURNING id, job_type AS type, payload, actor_user_id AS actor, idempotency_key AS "idempotencyKey", status, attempts, max_attempts AS "maxAttempts", queued_at AS "queuedAt", started_at AS "startedAt", completed_at AS "completedAt", last_error AS "lastError"`, [`JOB-${randomUUID().slice(0, 8).toUpperCase()}`, institutionId, type, payload, actor, idempotencyKey]);
    return rows[0];
  }
  if (idempotencyKey) {
    const existing = [...jobs.values()].find(item => item.idempotencyKey === idempotencyKey && item.type === type);
    if (existing) return existing;
  }
  const id = `JOB-${randomUUID().slice(0, 8).toUpperCase()}`;
  const job = { id, type, payload, actor, idempotencyKey, status: 'Queued', attempts: 0, maxAttempts, queuedAt: new Date().toISOString(), startedAt: null, completedAt: null, lastError: null };
  jobs.set(id, job);
  setTimeout(() => {
    const current = jobs.get(id);
    if (!current) return;
    current.attempts += 1;
    current.status = 'Processing';
    current.startedAt = new Date().toISOString();
    current.status = 'Completed';
    current.completedAt = new Date().toISOString();
  }, 250);
  return job;
}

export async function listJobs(institutionId) {
  if (!databaseStatus().configured) return [...jobs.values()].sort((a, b) => b.queuedAt.localeCompare(a.queuedAt));
  const { rows } = await query(`SELECT id, job_type AS type, payload, actor_user_id AS actor, idempotency_key AS "idempotencyKey", status, attempts, max_attempts AS "maxAttempts", queued_at AS "queuedAt", started_at AS "startedAt", completed_at AS "completedAt", last_error AS "lastError" FROM jobs WHERE institution_id = $1 ORDER BY queued_at DESC`, [institutionId]);
  return rows;
}
export async function getJob(id, institutionId) {
  if (!databaseStatus().configured) return jobs.get(id) || null;
  const { rows } = await query(`SELECT id, job_type AS type, payload, actor_user_id AS actor, idempotency_key AS "idempotencyKey", status, attempts, max_attempts AS "maxAttempts", queued_at AS "queuedAt", started_at AS "startedAt", completed_at AS "completedAt", last_error AS "lastError" FROM jobs WHERE institution_id = $1 AND id = $2`, [institutionId, id]);
  return rows[0] || null;
}
