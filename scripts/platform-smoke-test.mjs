const base = process.env.CCMS_API_URL || 'http://localhost:8787';

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const health = await request('/api/health');
assert(health.response.status === 200 && health.body.status === 'ok', 'health check failed');
assert(health.response.headers.get('x-correlation-id'), 'correlation ID missing');

const readiness = await request('/api/readiness');
assert(readiness.response.status === 200 && readiness.body.checks, 'readiness check failed');
const metrics = await request('/api/metrics');
assert(metrics.response.status === 200 && metrics.body.service === 'northern-star-ccms-api', 'metrics endpoint failed');

const invalidProposal = await request('/api/proposals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
assert(invalidProposal.response.status === 400, 'invalid proposal was not rejected');
const wrongContentType = await request('/api/proposals', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' });
assert(wrongContentType.response.status === 415, 'wrong mutation content type was accepted');

const evidence = await request('/api/evidence', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Platform smoke evidence', evidenceType: 'Test', storageKey: 'smoke/platform.txt', privacyClassification: 'Restricted' }) });
assert(evidence.response.status === 201 && evidence.body.status === 'Available' && evidence.body.privacyClassification === 'Restricted', 'evidence privacy classification was not preserved');
assert(evidence.body.storageKey === '[protected]', 'evidence storage key was exposed');

const unsafeEvidence = await request('/api/evidence', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Unsafe evidence', evidenceType: 'Test', storageKey: '../outside.txt' }) });
assert(unsafeEvidence.response.status === 400, 'unsafe evidence storage key was accepted');

const badChecksum = await request('/api/evidence', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Bad checksum', evidenceType: 'Test', storageKey: 'smoke/bad.txt', checksum: 'not-sha256' }) });
assert(badChecksum.response.status === 400, 'invalid evidence checksum was accepted');
const badClassification = await request('/api/evidence', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Bad classification', evidenceType: 'Test', storageKey: 'smoke/classification.txt', privacyClassification: 'Secret' }) });
assert(badClassification.response.status === 400, 'invalid evidence privacy classification was accepted');

const job = await request('/api/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'platform.smoke', payload: { evidenceId: evidence.body.id } }) });
assert(job.response.status === 202 && job.body.status === 'Queued', 'job enqueue failed');

const audit = await request('/api/audit-events');
assert(audit.response.status === 200 && audit.body.events.at(-1)?.eventHash && audit.body.events.at(-1)?.privacyClassification, 'tamper-evident classified audit chain missing');

const jobs = await request('/api/jobs');
assert(jobs.response.status === 200 && jobs.body.jobs.some(item => item.id === job.body.id), 'job listing failed');

console.log(JSON.stringify({ ok: true, readiness: readiness.body.status, evidenceId: evidence.body.id, jobId: job.body.id }));
