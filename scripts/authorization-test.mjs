import { authorize } from '../server/authorization.js';

const context = { subject: 'user-1', institutionId: 'tenant-a', roles: ['Curriculum Administrator'], scopes: ['curriculum:write'] };
function assertThrows(fn, message) { try { fn(); throw new Error(`${message}: unexpectedly allowed`); } catch (error) { if (error.message.includes('unexpectedly allowed')) throw error; } }

authorize(context, { institutionId: 'tenant-a', roles: ['Curriculum Administrator'], scope: 'curriculum:write' });
assertThrows(() => authorize(context, { institutionId: 'tenant-b' }), 'cross-tenant access');
assertThrows(() => authorize(context, { roles: ['Committee Member'] }), 'missing role');
assertThrows(() => authorize(context, { scope: 'admin:write' }), 'missing scope');
assertThrows(() => authorize(null, { institutionId: 'tenant-a' }), 'anonymous access');
console.log(JSON.stringify({ ok: true, checks: ['institution', 'role', 'scope', 'anonymous'] }));
