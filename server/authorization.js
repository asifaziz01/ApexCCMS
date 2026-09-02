function denied(message = 'Forbidden') {
  return Object.assign(new Error(message), { statusCode: 403 });
}

export function assertInstitution(context, institutionId) {
  if (!context?.institutionId || context.institutionId !== institutionId) throw denied('Institution scope denied');
  return context;
}

export function requireAnyRole(context, roles) {
  if (!context?.roles?.some(role => roles.includes(role))) throw denied('Required role missing');
  return context;
}

export function requireScope(context, scope) {
  if (!context?.scopes?.includes(scope)) throw denied(`Required scope missing: ${scope}`);
  return context;
}

export function authorize(context, { institutionId, roles = [], scope } = {}) {
  if (institutionId) assertInstitution(context, institutionId);
  if (roles.length) requireAnyRole(context, roles);
  if (scope) requireScope(context, scope);
  return context;
}
