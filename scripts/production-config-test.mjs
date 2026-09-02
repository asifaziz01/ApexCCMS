import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./production-config-check.mjs', import.meta.url));
function assert(condition, message) { if (!condition) throw new Error(message); }
function run(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, output }));
  });
}
const valid = await run({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://ccms_app:real-secret@postgres.internal:5432/northern_star_ccms', OIDC_ISSUER_URL: 'https://idp.college.ca', OIDC_CLIENT_ID: 'northern-star-ccms-prod', CORS_ORIGIN: 'https://ccms.college.ca', INSTITUTION_ID: '00000000-0000-4000-8000-000000000001', EVIDENCE_STORAGE_PROVIDER: 's3-ca-central', DATA_RESIDENCY_REGION: 'ca-central-1', REQUIRE_AUTH: 'true' });
assert(valid.code === 0 && valid.output.includes('"productionReady":true'), 'valid production configuration was rejected');
const wildcard = await run({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://ccms_app:real-secret@postgres.internal:5432/northern_star_ccms', OIDC_ISSUER_URL: 'https://idp.college.ca', OIDC_CLIENT_ID: 'northern-star-ccms-prod', CORS_ORIGIN: 'https://*', INSTITUTION_ID: '00000000-0000-4000-8000-000000000001', EVIDENCE_STORAGE_PROVIDER: 's3-ca-central', DATA_RESIDENCY_REGION: 'ca-central-1', REQUIRE_AUTH: 'true' });
assert(wildcard.code !== 0 && wildcard.output.includes('CORS_ORIGIN'), 'wildcard production CORS was accepted');
console.log(JSON.stringify({ ok: true, validConfiguration: 'accepted', wildcardCors: 'rejected' }));
