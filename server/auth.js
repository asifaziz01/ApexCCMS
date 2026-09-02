import { createRemoteJWKSet, jwtVerify } from 'jose';

const issuer = process.env.OIDC_ISSUER_URL;
const audience = process.env.OIDC_CLIENT_ID;
const jwksUrl = process.env.OIDC_JWKS_URL || (issuer ? `${issuer.replace(/\/$/, '')}/.well-known/jwks.json` : null);
const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;

export function authStatus() {
  return { configured: Boolean(issuer && audience && jwks), issuer: issuer || null };
}

export async function authenticateRequest(req, { required = false } = {}) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    if (required) throw Object.assign(new Error('Bearer token required'), { statusCode: 401 });
    return null;
  }
  if (!jwks || !issuer || !audience) throw Object.assign(new Error('OIDC authentication is not configured'), { statusCode: 503 });
  const token = header.slice('Bearer '.length);
  const { payload } = await jwtVerify(token, jwks, { issuer, audience });
  return {
    subject: payload.sub,
    email: payload.email,
    institutionId: payload.institution_id || payload.tenant_id,
    roles: Array.isArray(payload.roles) ? payload.roles : [],
    scopes: typeof payload.scope === 'string' ? payload.scope.split(' ').filter(Boolean) : []
  };
}
