import http from 'node:http';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

const { privateKey, publicKey } = await generateKeyPair('RS256');
const jwk = await exportJWK(publicKey);
jwk.kid = 'ccms-test-key';
jwk.alg = 'RS256';
jwk.use = 'sig';
const issuer = 'http://localhost:8791/issuer';
const audience = 'northern-star-test';
const jwksServer = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ keys: [jwk] })); });
await new Promise(resolve => jwksServer.listen(8791, '127.0.0.1', resolve));
process.env.OIDC_ISSUER_URL = issuer;
process.env.OIDC_CLIENT_ID = audience;
process.env.OIDC_JWKS_URL = 'http://127.0.0.1:8791/jwks';
const { authenticateRequest } = await import(`../server/auth.js?test=${Date.now()}`);
function assert(condition, message) { if (!condition) throw new Error(message); }
async function rejects(work, message) { try { await work(); } catch { return; } throw new Error(message); }
try {
  const token = await new SignJWT({ email: 'aisha.khan@northernstar.ca', institution_id: '00000000-0000-4000-8000-000000000001', roles: ['Curriculum Administrator'], scope: 'ccms.read ccms.write' })
    .setProtectedHeader({ alg: 'RS256', kid: jwk.kid }).setSubject('oidc-aisha').setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime('5m').sign(privateKey);
  const context = await authenticateRequest({ headers: { authorization: `Bearer ${token}` } }, { required: true });
  assert(context.subject === 'oidc-aisha' && context.institutionId.endsWith('0001') && context.roles.includes('Curriculum Administrator') && context.scopes.includes('ccms.write'), 'valid JWT claims were not mapped');
  await rejects(() => authenticateRequest({ headers: {} }, { required: true }), 'missing bearer token was accepted');
  const wrongIssuer = await new SignJWT({ institution_id: context.institutionId }).setProtectedHeader({ alg: 'RS256', kid: jwk.kid }).setSubject('wrong-issuer').setIssuer('http://wrong.example').setAudience(audience).setIssuedAt().setExpirationTime('5m').sign(privateKey);
  await rejects(() => authenticateRequest({ headers: { authorization: `Bearer ${wrongIssuer}` } }, { required: true }), 'wrong issuer token was accepted');
  console.log(JSON.stringify({ ok: true, signedJwt: 'verified', claimMapping: 'verified', issuerAudience: 'verified' }));
} finally {
  await new Promise(resolve => jwksServer.close(resolve));
}
