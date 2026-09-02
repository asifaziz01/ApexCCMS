import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const port = 8789;
const child = spawn(process.execPath, [fileURLToPath(new URL('../server/index.js', import.meta.url))], { env: { ...process.env, PORT: String(port), NODE_ENV: 'production', DATABASE_URL: 'postgresql://invalid:invalid@localhost:5432/does_not_exist', REQUIRE_AUTH: 'false', EVIDENCE_STORAGE_PROVIDER: 'object-storage', INSTITUTION_ID: '00000000-0000-4000-8000-000000000001' }, stdio: ['ignore', 'pipe', 'pipe'] });
try {
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('production error test API did not start')), 5000); child.stdout.on('data', chunk => { if (chunk.toString().includes('listening')) { clearTimeout(timer); resolve(); } }); child.on('error', reject); });
  const response = await fetch(`http://localhost:${port}/api/proposals`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ proposalType: 'New Course', title: 'Error disclosure test', academicUnitId: '00000000-0000-4000-8000-000000000002', effectiveTerm: 'Fall 2026' }) });
  const body = await response.json();
  if (response.status !== 500 || body.error !== 'Internal server error' || !body.correlationId) throw new Error(`Unexpected production error response: ${JSON.stringify(body)}`);
  const readiness = await fetch(`http://localhost:${port}/api/readiness`);
  const readinessBody = await readiness.json();
  if (readiness.status !== 503 || readinessBody.productionReady !== false || readinessBody.checks.databaseReachable !== false) throw new Error(`Unreachable database was reported ready: ${JSON.stringify(readinessBody)}`);
  console.log(JSON.stringify({ ok: true, genericError: true, correlationId: Boolean(body.correlationId) }));
} finally {
  child.kill();
}
