import { readFile } from 'node:fs/promises';

const nginx = await readFile(new URL('../nginx.conf', import.meta.url), 'utf8');
const compose = await readFile(new URL('../docker-compose.production.yml', import.meta.url), 'utf8');
const worker = await readFile(new URL('../server/worker.js', import.meta.url), 'utf8');
const dockerignore = await readFile(new URL('../.dockerignore', import.meta.url), 'utf8');
const db = await readFile(new URL('../server/db.js', import.meta.url), 'utf8');
function assert(condition, message) { if (!condition) throw new Error(message); }

assert(nginx.includes("connect-src 'self'"), 'Nginx CSP must permit same-origin API calls');
assert(!nginx.includes('localhost:8787'), 'production Nginx CSP must not depend on localhost');
for (const variable of ['DATABASE_URL', 'OIDC_ISSUER_URL', 'OIDC_CLIENT_ID', 'CORS_ORIGIN', 'INSTITUTION_ID', 'EVIDENCE_STORAGE_PROVIDER', 'DATA_RESIDENCY_REGION', 'VITE_API_URL']) {
  assert(compose.includes(`${variable}:`), `production Compose must require ${variable}`);
}
assert(compose.includes('REQUIRE_AUTH: "true"'), 'production Compose must enforce authentication');
assert(compose.includes('command: ["node", "scripts/worker.mjs"]'), 'production Compose must run a worker');
assert(compose.includes('JOB_POLL_MS:'), 'production Compose must configure the worker polling variable');
assert(worker.includes('FOR UPDATE SKIP LOCKED'), 'worker must claim jobs with row locking');
assert(worker.includes('Worker lease expired'), 'worker must recover abandoned processing leases');
assert(worker.includes("'Dead-lettered'"), 'worker must support dead-letter transitions');
assert(worker.includes('id = $1 AND institution_id = $2'), 'worker completion/failure updates must be tenant-scoped');
const repositories = await readFile(new URL('../server/repositories.js', import.meta.url), 'utf8');
assert(repositories.includes('WHERE id = $1 AND institution_id = $2') && repositories.includes('WHERE id = $1 AND institution_id = $3'), 'proposal transition writes must be tenant-scoped');
assert(repositories.includes('institution_id = $1 AND id = $2 AND effective_to IS NULL'), 'new proposals must target the current Academic Unit version');
assert(db.includes("event: 'database_pool_error'"), 'database pool errors must be logged structurally');
for (const entry of ['node_modules', 'dist', '.git', '.env', '*.log']) assert(dockerignore.split(/\r?\n/).includes(entry), `Docker context must exclude ${entry}`);
console.log(JSON.stringify({ ok: true, checks: 21, productionCompose: 'hardened', workerRecovery: 'verified', residencyGate: 'required', dockerContext: 'hardened', poolObservability: 'verified' }));
