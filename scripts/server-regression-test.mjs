import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const base = process.env.CCMS_API_URL || 'http://localhost:8787';
async function request(path, options = {}) {
  const response = await fetch(path.startsWith('http') ? path : `${base}${path}`, options);
  const text = await response.text();
  let body; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}
function assert(condition, message) { if (!condition) throw new Error(message); }

const malformed = await request('/api/proposals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
assert(malformed.response.status === 400, 'malformed JSON was not rejected');
const key = `regression-${Date.now()}`;
const first = await request('/api/jobs', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify({ type: 'regression.idempotency' }) });
const second = await request('/api/jobs', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify({ type: 'regression.idempotency' }) });
assert(first.response.status === 202 && second.response.status === 202 && first.body.id === second.body.id, 'job idempotency failed');
const unsafe = await request('/api/evidence', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Unsafe', evidenceType: 'Test', storageKey: 'folder\\unsafe.txt' }) });
assert(unsafe.response.status === 400, 'unsafe backslash storage key was accepted');

const protectedPort = 8788;
const child = spawn(process.execPath, [fileURLToPath(new URL('../server/index.js', import.meta.url))], { env: { ...process.env, PORT: String(protectedPort), NODE_ENV: 'production', REQUIRE_AUTH: 'true', OIDC_ISSUER_URL: '', OIDC_CLIENT_ID: '', OIDC_JWKS_URL: '', CORS_ORIGIN: '*', RATE_LIMIT_PER_MINUTE: '20', MAX_BODY_BYTES: '16384' }, stdio: ['ignore', 'pipe', 'pipe'] });
try {
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('protected API did not start')), 5000); child.stdout.on('data', chunk => { if (chunk.toString().includes('listening')) { clearTimeout(timer); resolve(); } }); child.on('error', reject); });
const protectedHealth = await request(`http://localhost:${protectedPort}/api/health`);
  assert(protectedHealth.response.status === 200, 'protected health endpoint failed');
  const protectedRead = await request(`http://localhost:${protectedPort}/api/proposals`);
  assert(protectedRead.response.status === 401, 'protected read route did not require authentication');
  const protectedMetrics = await request(`http://localhost:${protectedPort}/api/metrics`);
  assert(protectedMetrics.response.status === 401, 'metrics endpoint did not require authentication');
  for (const path of ['/api/institution', '/api/academic-structure', '/api/users', '/api/audit-events', '/api/evidence', '/api/jobs', '/api/publications', '/api/consumer', '/api/session']) {
    const protectedRoute = await request(`http://localhost:${protectedPort}${path}`);
    assert(protectedRoute.response.status === 401, `${path} did not require authentication`);
  }
  const productionReadiness = await request(`http://localhost:${protectedPort}/api/readiness`);
  assert(productionReadiness.response.status === 503 && productionReadiness.body.productionReady === false && productionReadiness.body.checks.corsOriginConfigured === false, 'production readiness did not fail closed');
  const rateResponses = await Promise.all(Array.from({ length: 11 }, () => request(`http://localhost:${protectedPort}/api/health`)));
  assert(rateResponses.at(-1).response.status === 429, 'configurable rate limit was not enforced');
} finally {
  child.kill();
}
const bodyPort = 8790;
const bodyChild = spawn(process.execPath, [fileURLToPath(new URL('../server/index.js', import.meta.url))], { env: { ...process.env, PORT: String(bodyPort), NODE_ENV: 'production', REQUIRE_AUTH: 'false', MAX_BODY_BYTES: '16384' }, stdio: ['ignore', 'pipe', 'pipe'] });
try {
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('body-limit API did not start')), 5000); bodyChild.stdout.on('data', chunk => { if (chunk.toString().includes('listening')) { clearTimeout(timer); resolve(); } }); bodyChild.on('error', reject); });
  const oversized = await request(`http://localhost:${bodyPort}/api/proposals`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ oversized: 'x'.repeat(20_000) }) });
  assert(oversized.response.status === 413, 'oversized request body did not return 413');
} finally {
  bodyChild.kill();
}
console.log(JSON.stringify({ ok: true, idempotentJobId: first.body.id, authEnforcement: 'verified', rateLimit: 'verified' }));
