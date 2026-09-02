const required = ['DATABASE_URL', 'OIDC_ISSUER_URL', 'OIDC_CLIENT_ID', 'CORS_ORIGIN', 'INSTITUTION_ID', 'EVIDENCE_STORAGE_PROVIDER', 'DATA_RESIDENCY_REGION'];
const missing = required.filter(name => !process.env[name]);
const placeholders = Object.entries(process.env).filter(([name, value]) => required.includes(name) && /example|replace-me|change-me|localhost/i.test(value || '')).map(([name]) => name);
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
const failures = [...missing.map(name => `${name} is missing`), ...placeholders.map(name => `${name} still contains a placeholder`), ...(process.env.REQUIRE_AUTH !== 'true' ? ['REQUIRE_AUTH must be true'] : []), ...(!uuid(process.env.INSTITUTION_ID) ? ['INSTITUTION_ID must be a UUID'] : []), ...(!/^https:\/\/[^*\s]+$/i.test(process.env.CORS_ORIGIN || '') ? ['CORS_ORIGIN must be one non-wildcard HTTPS origin'] : [])];
if (failures.length) {
  console.error(JSON.stringify({ productionReady: false, failures }));
  process.exit(1);
}
console.log(JSON.stringify({ productionReady: true, checks: required }));
