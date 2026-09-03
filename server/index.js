import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { databaseStatus, databaseReady, closeDatabase } from './db.js';
import { authStatus, authenticateRequest } from './auth.js';
import { getInstitution, listAcademicUnits, renameAcademicUnit, listUsers, listProposals, getProposal, listPublications, listPublishedConsumerRecords, listAuditEvents, listEvidenceItems, createEvidenceItem, createProposal, advanceProposal, promoteProposal, queuePublication, publishPublication, appendAuditEvent } from './repositories.js';
import { authorize } from './authorization.js';
import { enqueueJob, listJobs, getJob } from './jobs.js';

const institution = { id: 'INS-000001', name: 'Northern Star College', status: 'Active' };
const academicUnits = [
  { id: 'AU-000042', name: 'School of Business', faculty: 'Faculty of Business', status: 'Active', currentSince: '2024-01-01', versions: [{ name: 'School of Business', effectiveFrom: '2024-01-01', effectiveTo: null }] },
  { id: 'AU-000057', name: 'School of Technology', faculty: 'Faculty of Applied Arts & Technology', status: 'Active', currentSince: '2025-09-01', versions: [{ name: 'School of Technology', effectiveFrom: '2025-09-01', effectiveTo: null }] },
  { id: 'AU-000063', name: 'School of Health Sciences', faculty: 'Faculty of Health', status: 'Active', currentSince: '2023-01-01', versions: [{ name: 'School of Health Sciences', effectiveFrom: '2023-01-01', effectiveTo: null }] },
  { id: 'AU-000018', name: 'School of Liberal Arts', faculty: 'Faculty of Arts', status: 'Renamed', currentSince: '2026-09-01', versions: [{ name: 'School of Liberal Arts', effectiveFrom: '2020-01-01', effectiveTo: '2026-08-31' }, { name: 'School of Liberal Arts', effectiveFrom: '2026-09-01', effectiveTo: null }] }
];
const users = [
  { id: 'USR-000001', initials: 'AK', name: 'Aisha Khan', email: 'aisha.khan@northernstar.ca', role: 'Curriculum Administrator', scope: 'Institution', status: 'Active' },
  { id: 'USR-000002', initials: 'JD', name: 'Jordan Davis', email: 'jordan.davis@northernstar.ca', role: 'Curriculum Creator', scope: 'School of Business', status: 'Active' },
  { id: 'USR-000003', initials: 'ML', name: 'Morgan Lee', email: 'morgan.lee@northernstar.ca', role: 'Committee Member', scope: 'School of Technology', status: 'Active' }
];
const auditEvents = [];
const proposals = [];
const publications = [];
const evidenceItems = [];
const catalogue = {
  courses: { total: 1248, records: [{ id: 'CRS-000481', code: 'COMP 481', title: 'Machine Learning', academicUnit: 'School of Technology', status: 'Active', version: 'v2.1', effectiveTerm: 'Fall 2026' }, { id: 'CRS-000392', code: 'BUS 210', title: 'Financial Accounting', academicUnit: 'School of Business & Commerce', status: 'Active', version: 'v2.1', effectiveTerm: 'Fall 2026' }, { id: 'CRS-000517', code: 'HLTH 120', title: 'Foundations of Health', academicUnit: 'School of Health Sciences', status: 'In Review', version: 'v1.0', effectiveTerm: 'Winter 2027' }] },
  programs: { total: 145, records: [{ id: 'PRG-000184', code: 'BUS-ADM-DIP', title: 'Business Administration', academicUnit: 'School of Business & Commerce', credential: 'Diploma', status: 'Active', version: 'v3.0', effectiveTerm: 'Fall 2026' }, { id: 'PRG-000231', code: 'CYBR-ADV-DIP', title: 'Cyber Security', academicUnit: 'School of Technology', credential: 'Advanced Diploma', status: 'Active', version: 'v2.0', effectiveTerm: 'Winter 2027' }, { id: 'PRG-000267', code: 'DMKT-GC', title: 'Digital Marketing', academicUnit: 'School of Business & Commerce', credential: 'Graduate Certificate', status: 'Review', version: 'v1.0', effectiveTerm: 'Fall 2026' }] },
  credentials: { total: 38, records: [{ id: 'CRD-000021', code: 'BUS-ADM-DIP', title: 'Diploma in Business Administration', type: 'Diploma', status: 'Active' }, { id: 'CRD-000034', code: 'CYBR-ADV-DIP', title: 'Advanced Diploma in Cyber Security', type: 'Advanced Diploma', status: 'Active' }, { id: 'CRD-000047', code: 'DMKT-GC', title: 'Graduate Certificate in Digital Marketing', type: 'Graduate Certificate', status: 'Review' }] },
  requirements: { total: 684, records: [{ id: 'REQ-000184', title: 'COMP 481 prerequisite', ruleType: 'Course prerequisite', expression: 'COMP 201 (minimum C) AND (STAT 210 OR MATH 250)', scope: 'Course', status: 'Active' }, { id: 'REQ-000231', title: 'Business Administration residency', ruleType: 'Program completion', expression: 'Minimum 45 credits completed at institution', scope: 'Program', status: 'Active' }, { id: 'REQ-000267', title: 'Graduation application window', ruleType: 'Credential award', expression: 'Application submitted before academic deadline', scope: 'Credential', status: 'Draft' }] },
  outcomes: { total: 2486, records: [{ id: 'LO-000784', statement: 'Apply supervised learning techniques to solve classification problems.', curriculumItem: 'COMP 481 — Machine Learning', classification: 'Apply', mapping: 'Mapped', status: 'Complete' }, { id: 'LO-000785', statement: 'Evaluate model performance using appropriate validation metrics.', curriculumItem: 'COMP 481 — Machine Learning', classification: 'Evaluate', mapping: 'Mapped', status: 'Complete' }, { id: 'LO-000642', statement: 'Communicate financial analysis using professional reporting standards.', curriculumItem: 'BUS 210 — Financial Accounting', classification: 'Create', mapping: 'Partial', status: 'Needs review' }] },
  maps: { total: 145, records: [{ id: 'MAP-000481', course: 'COMP 481 — Machine Learning', program: 'Computer Science Diploma', outcomes: 24, mappedOutcomes: 18, coverage: 92, health: 'Healthy' }, { id: 'MAP-000392', course: 'BUS 210 — Financial Accounting', program: 'Business Administration Diploma', outcomes: 18, mappedOutcomes: 15, coverage: 83, health: 'Needs review' }, { id: 'MAP-000517', course: 'HLTH 120 — Foundations of Health', program: 'Practical Nursing Diploma', outcomes: 21, mappedOutcomes: 21, coverage: 100, health: 'Healthy' }] }
};
const referenceData = [
  { id: 'RD-00001', name: 'Academic Terms', values: 'Fall 2026 · Winter 2027 · Spring 2027', domain: 'Institutional', status: 'Active' },
  { id: 'RD-00002', name: 'Credential Types', values: 'Certificate · Diploma · Advanced Diploma · Degree', domain: 'Institutional', status: 'Active' },
  { id: 'RD-00003', name: 'Course Levels', values: 'Foundational · Undergraduate · Graduate', domain: 'Curriculum', status: 'Active' },
  { id: 'RD-00004', name: 'Bloom’s Taxonomy', values: 'Remember · Understand · Apply · Analyze · Evaluate · Create', domain: 'Curriculum', status: 'Active' },
  { id: 'RD-00005', name: 'Jurisdictions', values: 'Federal · Ontario · British Columbia · Alberta', domain: 'Quality / External', status: 'Active' }
];
const externalReviewCases = [
  { id: 'CASE-000084', curriculumItem: 'New Course · COMP 481 — Machine Learning', externalBody: 'NS-CES', status: 'Under Review', nextDeadline: 'Jun 24, 2026' },
  { id: 'CASE-000079', curriculumItem: 'Program Modification · Digital Marketing', externalBody: 'Quality Council', status: 'Information Requested', nextDeadline: 'Jun 18, 2026' },
  { id: 'CASE-000072', curriculumItem: 'New Program · Cyber Security Advanced Diploma', externalBody: 'NS-CES', status: 'Decision Pending', nextDeadline: 'Jul 2, 2026' },
  { id: 'CASE-000061', curriculumItem: 'Credential Change · Data Analytics Certificate', externalBody: 'Ontario Colleges QA', status: 'Conditions Open', nextDeadline: 'Aug 14, 2026' }
];
const requireAuth = process.env.REQUIRE_AUTH === 'true';
const configuredInstitutionId = process.env.INSTITUTION_ID || institution.id;
const rateBuckets = new Map();
const rateLimitPerMinute = Math.max(10, Number(process.env.RATE_LIMIT_PER_MINUTE || 120));
const maxBodyBytes = Math.min(10_485_760, Math.max(16_384, Number(process.env.MAX_BODY_BYTES || 1_048_576)));
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const secureCorsOrigin = process.env.NODE_ENV !== 'production' || /^https:\/\/[^*\s]+$/i.test(allowedOrigin);
const evidenceStorageProvider = process.env.EVIDENCE_STORAGE_PROVIDER || '';
const dataResidencyRegion = process.env.DATA_RESIDENCY_REGION || '';
const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const metrics = { startedAt: new Date().toISOString(), requests: 0, errors: 0, byStatus: {} };

function json(res, status, payload) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': allowedOrigin, 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(payload)); }
async function audit(action, objectType, objectId, previousValue, newValue, reason = 'Local foundation mutation', correlationId) {
  const privacyClassification = objectType === 'EvidenceItem' ? 'Confidential' : 'Internal';
  const event = { id: `AUD-${String(auditEvents.length + 1).padStart(6, '0')}`, actor: 'USR-000001', scope: configuredInstitutionId, action, objectType, objectId, previousValue, newValue, privacyClassification, reason, occurredAt: new Date().toISOString() };
  event.previousHash = auditEvents.at(-1)?.eventHash || 'GENESIS';
  event.eventHash = createHash('sha256').update(JSON.stringify(event)).digest('hex');
  auditEvents.push(event);
  if (databaseStatus().configured) await appendAuditEvent({ institutionId: configuredInstitutionId, actorUserId: null, eventType: action, entityType: objectType, entityId: objectId, beforeState: previousValue, afterState: newValue, correlationId, privacyClassification });
  return event;
}
function readBody(req) { return new Promise((resolve, reject) => { let body = ''; let size = 0; let rejected = false; req.on('data', chunk => { if (rejected) return; size += chunk.length; if (size > maxBodyBytes) { rejected = true; reject(Object.assign(new Error(`Request body exceeds ${maxBodyBytes} byte limit`), { statusCode: 413 })); req.resume(); return; } body += chunk; }); req.on('end', () => { if (rejected) return; try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(Object.assign(new Error('Request body must be valid JSON'), { statusCode: 400 })); } }); req.on('error', error => { if (!rejected) reject(error); }); }); }
function structuredLog(event) { console.log(JSON.stringify({ service: 'northern-star-ccms-api', ...event })); }
function enforce(context, roles) { if (requireAuth) authorize(context, { institutionId: configuredInstitutionId, roles }); }
function validStorageKey(value) { return typeof value === 'string' && value.length <= 512 && value.length > 0 && !value.startsWith('/') && !value.startsWith('\\') && !value.includes('..') && !value.includes('\\'); }
function publicEvidence(item) { return item ? { ...item, storageKey: '[protected]' } : item; }

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS', 'Vary': 'Origin' }); return res.end(); }
  const url = new URL(req.url, 'http://localhost');
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  res.setHeader('X-Correlation-ID', correlationId);
  const startedAt = Date.now();
  const originalEnd = res.end.bind(res);
  res.end = (...args) => { metrics.requests += 1; metrics.byStatus[res.statusCode] = (metrics.byStatus[res.statusCode] || 0) + 1; if (res.statusCode >= 400) metrics.errors += 1; structuredLog({ event: 'http_request', method: req.method, path: url.pathname, status: res.statusCode, correlationId, durationMs: Date.now() - startedAt }); return originalEnd(...args); };
  try {
    if (url.pathname.startsWith('/api/')) {
      const clientKey = req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      if (rateBuckets.size > 10_000) for (const [key, value] of rateBuckets) if (now - value.startedAt >= 60_000) rateBuckets.delete(key);
      const bucket = rateBuckets.get(clientKey);
      if (!bucket || now - bucket.startedAt >= 60_000) rateBuckets.set(clientKey, { startedAt: now, count: 1 });
      else if (bucket.count >= rateLimitPerMinute) { res.setHeader('Retry-After', '60'); return json(res, 429, { error: 'Rate limit exceeded', correlationId }); }
      else bucket.count += 1;
    }
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { status: 'ok', service: 'northern-star-ccms-api', phase: 1, database: databaseStatus(), auth: authStatus() });
    if (req.method === 'GET' && url.pathname === '/api/readiness') {
      const database = databaseStatus();
      const auth = authStatus();
      const checks = { databaseConfigured: database.configured, databaseReachable: await databaseReady(), oidcConfigured: auth.configured, authEnforcementEnabled: requireAuth, institutionScopeConfigured: isUuid(configuredInstitutionId), evidenceStorageConfigured: Boolean(evidenceStorageProvider), dataResidencyConfigured: Boolean(dataResidencyRegion), corsOriginConfigured: secureCorsOrigin };
      const productionReady = Object.values(checks).every(Boolean);
      return json(res, productionReady || process.env.NODE_ENV !== 'production' ? 200 : 503, { status: productionReady ? 'production-ready' : 'demo-ready', productionReady, checks });
    }
    const context = url.pathname.startsWith('/api/') ? await authenticateRequest(req, { required: requireAuth }) : null;
    if (req.method === 'GET' && url.pathname === '/api/session') return json(res, context ? 200 : 401, context ? { authenticated: true, context } : { authenticated: false });
    if (requireAuth && url.pathname.startsWith('/api/') && url.pathname !== '/api/health' && url.pathname !== '/api/readiness') enforce(context, []);
    if (req.method === 'GET' && url.pathname === '/api/metrics') return json(res, 200, { service: 'northern-star-ccms-api', uptimeSeconds: Math.floor(process.uptime()), ...metrics });
    if (req.method === 'GET' && url.pathname === '/api/catalogue') return json(res, 200, { storage: databaseStatus().configured ? 'postgresql' : 'in-memory-demo', source: 'authorized-live-catalogue-read-model', catalogue });
    if (req.method === 'GET' && url.pathname === '/api/courses') return json(res, 200, { storage: databaseStatus().configured ? 'postgresql' : 'in-memory-demo', source: 'authorized-live-course-read-model', total: catalogue.courses.total, courses: catalogue.courses.records });
    if (req.method === 'GET' && url.pathname === '/api/programs') return json(res, 200, { storage: databaseStatus().configured ? 'postgresql' : 'in-memory-demo', source: 'authorized-live-program-read-model', total: catalogue.programs.total, programs: catalogue.programs.records });
    if (req.method === 'GET' && url.pathname === '/api/credentials') return json(res, 200, { storage: databaseStatus().configured ? 'postgresql' : 'in-memory-demo', source: 'authorized-live-credential-read-model', total: catalogue.credentials.total, credentials: catalogue.credentials.records });
    if (req.method === 'GET' && url.pathname === '/api/outcomes') return json(res, 200, { storage: databaseStatus().configured ? 'postgresql' : 'in-memory-demo', source: 'authorized-live-outcome-read-model', total: catalogue.outcomes.total, outcomes: catalogue.outcomes.records });
    const outcomeDetailMatch = url.pathname.match(/^\/api\/outcomes\/([^/]+)$/);
    if (req.method === 'GET' && outcomeDetailMatch) {
      const outcome = catalogue.outcomes.records.find(item => item.id === outcomeDetailMatch[1]);
      if (!outcome) return json(res, 404, { error: 'Learning outcome not found' });
      return json(res, 200, { storage: databaseStatus().configured ? 'postgresql' : 'in-memory-demo', source: 'authorized-live-outcome-read-model', outcome, classification: { framework: 'Bloom’s Taxonomy', level: outcome.classification }, mappings: [{ targetType: outcome.curriculumItem.includes('Program') ? 'Program' : 'Course', target: outcome.curriculumItem, mappingType: outcome.mapping }] });
    }
    const courseDetailMatch = url.pathname.match(/^\/api\/courses\/([^/]+)(?:\/(versions|program-associations))?$/);
    if (req.method === 'GET' && courseDetailMatch) {
      const course = catalogue.courses.records.find(item => item.id === courseDetailMatch[1]);
      if (!course) return json(res, 404, { error: 'Course not found' });
      if (courseDetailMatch[2] === 'versions') return json(res, 200, { courseId: course.id, versions: [{ id: `${course.id}-V${course.version.replace('v','')}`, version: course.version, status: course.status === 'Active' ? 'Official' : 'Proposed', effectiveTerm: course.effectiveTerm, title: course.title }] });
      if (courseDetailMatch[2] === 'program-associations') return json(res, 200, { courseId: course.id, associations: catalogue.programs.records.map(program => ({ programId: program.id, programCode: program.code, program: program.title, associationType: 'Eligible', status: program.status })) });
      return json(res, 200, { storage: databaseStatus().configured ? 'postgresql' : 'in-memory-demo', source: 'authorized-live-course-read-model', course });
    }
    const programDetailMatch = url.pathname.match(/^\/api\/programs\/([^/]+)(?:\/versions)?$/);
    if (req.method === 'GET' && programDetailMatch) {
      const program = catalogue.programs.records.find(item => item.id === programDetailMatch[1]);
      if (!program) return json(res, 404, { error: 'Program not found' });
      if (url.pathname.endsWith('/versions')) return json(res, 200, { programId: program.id, versions: [{ id: `${program.id}-V${program.version.replace('v','')}`, version: program.version, status: program.status === 'Active' ? 'Official' : 'Proposed', effectiveTerm: program.effectiveTerm, name: program.title }] });
      return json(res, 200, { storage: databaseStatus().configured ? 'postgresql' : 'in-memory-demo', source: 'authorized-live-program-read-model', program });
    }
    if (req.method === 'GET' && url.pathname === '/api/reference-data') return json(res, 200, { storage: databaseStatus().configured ? 'postgresql' : 'in-memory-demo', source: 'authorized-live-reference-read-model', referenceData });
    if (req.method === 'GET' && url.pathname === '/api/external-review/cases') return json(res, 200, { storage: databaseStatus().configured ? 'postgresql' : 'in-memory-demo', source: 'authorized-external-review-read-model', cases: externalReviewCases });
    if (req.method === 'GET' && url.pathname === '/api/dashboard') {
      const scope = context?.institutionId || configuredInstitutionId;
      const liveProposals = databaseStatus().configured ? await listProposals(scope) : proposals;
      const livePublications = databaseStatus().configured ? await listPublications(scope) : publications;
      const liveAudits = databaseStatus().configured ? await listAuditEvents(scope) : auditEvents;
      const liveEvidence = databaseStatus().configured ? await listEvidenceItems(scope) : evidenceItems;
      const liveJobs = databaseStatus().configured ? await listJobs(scope) : [];
      return json(res, 200, {
        storage: databaseStatus().configured ? 'postgresql' : 'in-memory-demo',
        source: 'authorized-live-read-model',
        counts: {
          proposals: liveProposals.length,
          proposalsUnderReview: liveProposals.filter(item => ['Submitted', 'Under Review'].includes(item.status)).length,
          proposalsApproved: liveProposals.filter(item => ['Approved', 'Official'].includes(item.status)).length,
          publications: livePublications.length,
          publicationsPublished: livePublications.filter(item => item.status === 'Published').length,
          evidence: liveEvidence.length,
          jobs: liveJobs.length
        },
        recentActivity: liveAudits.slice(0, 8)
      });
    }
    const hasRequestBody = req.headers['content-length'] !== '0' && (req.headers['content-length'] !== undefined || req.headers['transfer-encoding'] !== undefined);
    if (hasRequestBody && ['POST', 'PATCH', 'PUT'].includes(req.method) && req.headers['content-type']?.split(';')[0].trim() !== 'application/json') return json(res, 415, { error: 'Mutation requests with a body must use application/json', correlationId });
    if (req.method === 'GET' && url.pathname === '/api/institution') {
      if (databaseStatus().configured) { const record = await getInstitution(context?.institutionId || configuredInstitutionId); return record ? json(res, 200, record) : json(res, 404, { error: 'Institution not found' }); }
      return json(res, 200, institution);
    }
    if (req.method === 'GET' && url.pathname === '/api/academic-structure') {
      if (databaseStatus().configured) return json(res, 200, { academicUnits: await listAcademicUnits(context?.institutionId || configuredInstitutionId) });
      return json(res, 200, { institution, academicUnits });
    }
    if (req.method === 'GET' && url.pathname === '/api/users') {
      if (databaseStatus().configured) { const records = await listUsers(context?.institutionId || configuredInstitutionId); return json(res, 200, { total: records.length, users: records }); }
      return json(res, 200, { total: 248, users });
    }
    if (req.method === 'GET' && url.pathname === '/api/audit-events') {
      if (databaseStatus().configured) return json(res, 200, { events: await listAuditEvents(context?.institutionId || configuredInstitutionId), storage: 'postgresql' });
      return json(res, 200, { events: auditEvents, storage: 'in-memory-demo' });
    }
    if (req.method === 'GET' && url.pathname === '/api/evidence') {
      if (databaseStatus().configured) return json(res, 200, { evidence: (await listEvidenceItems(context?.institutionId || configuredInstitutionId)).map(publicEvidence), storage: 'postgresql' });
      return json(res, 200, { evidence: evidenceItems.map(publicEvidence), storage: 'in-memory-demo' });
    }
    if (req.method === 'GET' && url.pathname === '/api/jobs') return json(res, 200, { jobs: await listJobs(context?.institutionId || configuredInstitutionId), storage: databaseStatus().configured ? 'postgresql' : 'in-memory-demo' });
    const jobMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)$/);
    if (req.method === 'GET' && jobMatch) {
      const job = await getJob(jobMatch[1], context?.institutionId || configuredInstitutionId);
      return job ? json(res, 200, job) : json(res, 404, { error: 'Job not found' });
    }
    if (req.method === 'GET' && url.pathname === '/api/proposals') {
      if (databaseStatus().configured) return json(res, 200, { proposals: await listProposals(context?.institutionId || configuredInstitutionId), storage: 'postgresql' });
      return json(res, 200, { proposals, storage: 'in-memory-demo' });
    }
    if (req.method === 'GET' && url.pathname === '/api/governance/routes') return json(res, 200, { source: 'authorized-governance-route-read-model', routes: [{ id: 'WF-00001', proposalType: 'New Course', name: 'Default Curriculum Approval Route', status: 'Active', steps: ['Department Curriculum Committee', 'Faculty Curriculum Committee', 'Academic Programs Committee', 'Senate Curriculum Committee', 'Senate'] }] });
    const approvalHistoryMatch = url.pathname.match(/^\/api\/proposals\/([^/]+)\/approval-history$/);
    if (req.method === 'GET' && approvalHistoryMatch) {
      const scope = context?.institutionId || configuredInstitutionId;
      const events = databaseStatus().configured ? await listAuditEvents(scope) : auditEvents;
      return json(res, 200, { proposalId: approvalHistoryMatch[1], history: events.filter(event => event.entityId === approvalHistoryMatch[1]), source: 'authorized-governance-history-read-model' });
    }
    const proposalDetailMatch = url.pathname.match(/^\/api\/proposals\/([^/]+)$/);
    if (req.method === 'GET' && proposalDetailMatch) {
      const scope = context?.institutionId || configuredInstitutionId;
      const proposal = databaseStatus().configured ? await getProposal(scope, proposalDetailMatch[1]) : proposals.find(item => item.id === proposalDetailMatch[1]);
      return proposal ? json(res, 200, proposal) : json(res, 404, { error: 'Proposal not found' });
    }
    if (req.method === 'GET' && url.pathname === '/api/publications') {
      if (databaseStatus().configured) return json(res, 200, { publications: await listPublications(context?.institutionId || configuredInstitutionId), storage: 'postgresql' });
      return json(res, 200, { publications, storage: 'in-memory-demo' });
    }
    if (req.method === 'GET' && url.pathname === '/api/consumer') {
      if (databaseStatus().configured) return json(res, 200, { records: await listPublishedConsumerRecords(context?.institutionId || configuredInstitutionId), storage: 'postgresql' });
      return json(res, 200, { records: publications.filter(item => item.status === 'Published').map(item => ({ publicationId: item.id, proposalId: item.proposalId, officialVersion: item.officialVersion, channels: item.channels, visibility: 'Public' })), storage: 'in-memory-demo' });
    }
    if (req.method === 'POST' && url.pathname === '/api/proposals') {
      enforce(context, ['Curriculum Creator', 'Curriculum Administrator']);
      const body = await readBody(req);
      if (!body.proposalType || !body.title || !body.academicUnitId || !body.effectiveTerm) return json(res, 400, { error: 'proposalType, title, academicUnitId, and effectiveTerm are required' });
      const proposalTypes = ['New Course', 'Course Modification', 'Course Discontinuation', 'New Program', 'Program Modification', 'Program Suspension', 'Program Closure', 'New Credential', 'Credential Change'];
      if (!proposalTypes.includes(body.proposalType)) return json(res, 400, { error: 'proposalType is not supported' });
      const units = databaseStatus().configured ? await listAcademicUnits(context?.institutionId || configuredInstitutionId) : academicUnits;
      if (!units.some(unit => unit.id === body.academicUnitId)) return json(res, 400, { error: 'academicUnitId must reference an existing Academic Unit' });
      if (body.details !== undefined && (!body.details || typeof body.details !== 'object' || Array.isArray(body.details))) return json(res, 400, { error: 'details must be a JSON object' });
      if (JSON.stringify(body.details || {}).length > 500000) return json(res, 413, { error: 'details exceeds the 500000 character limit' });
      if (databaseStatus().configured) {
        const proposal = await createProposal({ institutionId: context?.institutionId || configuredInstitutionId, actorSubject: context?.subject || (requireAuth ? undefined : process.env.DEV_ACTOR_SUBJECT), proposalType: body.proposalType, title: body.title, academicUnitId: body.academicUnitId, effectiveTerm: body.effectiveTerm, details: body.details || {} });
        await audit('Proposal submitted', 'Proposal', proposal.id, null, proposal, 'Submitted from New Course Proposal wizard', correlationId);
        return json(res, 201, proposal);
      }
      const proposal = { id: `PROP-${String(proposals.length + 185).padStart(6, '0')}`, proposalType: body.proposalType, title: body.title, academicUnitId: body.academicUnitId, effectiveTerm: body.effectiveTerm, details: body.details || {}, proposedVersion: 'v1.0', status: 'Submitted', createdBy: 'USR-000001', submittedAt: new Date().toISOString() };
      proposals.push(proposal);
      await audit('Proposal submitted', 'Proposal', proposal.id, null, proposal, 'Submitted from New Course Proposal wizard', correlationId);
      return json(res, 201, proposal);
    }
    if (req.method === 'POST' && url.pathname === '/api/evidence') {
      enforce(context, ['Quality Administrator', 'Curriculum Administrator', 'External Review Administrator']);
      if (databaseStatus().configured && !evidenceStorageProvider) return json(res, 503, { error: 'Evidence storage provider is not configured', correlationId });
      const body = await readBody(req);
      if (!body.title || !body.evidenceType || !validStorageKey(body.storageKey)) return json(res, 400, { error: 'title, evidenceType, and a safe relative storageKey are required' });
      if (body.byteSize !== undefined && (!Number.isInteger(body.byteSize) || body.byteSize < 0 || body.byteSize > 100_000_000)) return json(res, 400, { error: 'byteSize must be an integer between 0 and 100000000' });
      if (body.checksum !== undefined && (typeof body.checksum !== 'string' || !/^[0-9a-f]{64}$/i.test(body.checksum))) return json(res, 400, { error: 'checksum must be a SHA-256 hexadecimal string' });
      if (body.retentionUntil !== undefined && (typeof body.retentionUntil !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.retentionUntil))) return json(res, 400, { error: 'retentionUntil must use YYYY-MM-DD format' });
      if (body.encryptionKeyRef !== undefined && (typeof body.encryptionKeyRef !== 'string' || body.encryptionKeyRef.length > 256 || body.encryptionKeyRef.includes('..'))) return json(res, 400, { error: 'encryptionKeyRef is invalid' });
      if (body.privacyClassification !== undefined && !['Public', 'Internal', 'Confidential', 'Restricted'].includes(body.privacyClassification)) return json(res, 400, { error: 'privacyClassification is invalid' });
      const evidence = databaseStatus().configured
        ? await createEvidenceItem({ institutionId: context?.institutionId || configuredInstitutionId, title: body.title, evidenceType: body.evidenceType, storageKey: body.storageKey, contentType: body.contentType || 'application/octet-stream', byteSize: body.byteSize, checksum: body.checksum, retentionUntil: body.retentionUntil, encryptionKeyRef: body.encryptionKeyRef, privacyClassification: body.privacyClassification || 'Internal', createdBy: context?.subject })
        : { id: `EVD-${String(evidenceItems.length + 1).padStart(6, '0')}`, title: body.title, evidenceType: body.evidenceType, storageKey: body.storageKey, contentType: body.contentType || 'application/octet-stream', byteSize: body.byteSize ?? null, checksum: body.checksum || null, malwareScanStatus: 'Pending', retentionUntil: body.retentionUntil || null, privacyClassification: body.privacyClassification || 'Internal', status: 'Available', createdBy: context?.subject || 'USR-000001', createdAt: new Date().toISOString() };
      evidenceItems.push(evidence);
      await audit('Evidence metadata registered', 'EvidenceItem', evidence.id, null, { ...evidence, storageKey: '[protected]' }, 'Evidence metadata registered without exposing document contents', correlationId);
      return json(res, 201, publicEvidence(evidence));
    }
    if (req.method === 'POST' && url.pathname === '/api/jobs') {
      enforce(context, ['Integration Administrator', 'Publication Administrator', 'Curriculum Administrator']);
      const body = await readBody(req);
      if (!body.type) return json(res, 400, { error: 'type is required' });
      return json(res, 202, await enqueueJob({ type: body.type, payload: body.payload, actor: context?.subject || 'USR-000001', idempotencyKey: req.headers['idempotency-key'] || body.idempotencyKey || null, institutionId: context?.institutionId || configuredInstitutionId }));
    }
    const proposalAction = url.pathname.match(/^\/api\/proposals\/([^/]+)\/(advance|promote)$/);
    if (req.method === 'POST' && proposalAction) {
      enforce(context, proposalAction[2] === 'promote' ? ['Curriculum Administrator', 'Governance Administrator'] : ['Committee Member', 'Curriculum Administrator', 'Governance Administrator']);
      if (databaseStatus().configured) {
        const updated = proposalAction[2] === 'promote' ? await promoteProposal(context?.institutionId || configuredInstitutionId, proposalAction[1]) : await advanceProposal(context?.institutionId || configuredInstitutionId, proposalAction[1]);
        if (!updated) return json(res, 404, { error: 'Proposal not found' });
        await audit(proposalAction[2] === 'promote' ? 'Official version promoted' : updated.status === 'Approved' ? 'Proposal approved' : 'Approval step completed', 'Proposal', updated.id, null, updated, 'Database-backed governance transition', correlationId);
        return json(res, 200, updated);
      }
      const proposal = proposals.find(item => item.id === proposalAction[1]);
      if (!proposal) return json(res, 404, { error: 'Proposal not found' });
      if (proposalAction[2] === 'advance') {
        const stages = ['Department Curriculum Committee', 'Faculty Curriculum Committee', 'Academic Programs Committee', 'Senate Curriculum Committee', 'Senate'];
        const current = stages.indexOf(proposal.currentStage);
        const next = current + 1;
        if (next >= stages.length) { proposal.currentStage = 'Final Approval Complete'; proposal.status = 'Approved'; proposal.officialVersion = 'v1.0'; await audit('Proposal approved', 'Proposal', proposal.id, 'Under Review', 'Approved', 'Final governance approval recorded', correlationId); return json(res, 200, proposal); }
        proposal.currentStage = stages[next]; proposal.status = 'Under Review'; await audit('Approval step completed', 'Proposal', proposal.id, stages[Math.max(current, 0)] ?? 'Submitted', proposal.currentStage, 'Governance approval progression', correlationId); return json(res, 200, proposal);
      }
      if (proposal.status !== 'Approved') return json(res, 409, { error: 'Final approval is required before promotion' });
      proposal.status = 'Official'; proposal.officialVersion = 'v1.0'; proposal.promotedAt = new Date().toISOString(); await audit('Official version promoted', 'OfficialCurriculumVersion', proposal.id, 'Approved proposal', 'Official v1.0', 'Final approval promotion', correlationId); return json(res, 200, proposal);
    }
    if (req.method === 'POST' && url.pathname === '/api/publications') {
      enforce(context, ['Publication Administrator', 'Curriculum Administrator']);
      const body = await readBody(req);
      if (databaseStatus().configured) {
        const publication = await queuePublication({ institutionId: context?.institutionId || configuredInstitutionId, proposalId: body.proposalId, channels: body.channels || [] });
        await audit('Official version queued for publication', 'PublicationJob', publication.id, null, publication, 'Publication eligibility check passed', correlationId);
        return json(res, 201, publication);
      }
      const proposal = proposals.find(item => item.id === body.proposalId);
      if (!proposal || proposal.status !== 'Official') return json(res, 409, { error: 'Only Official Curriculum Versions may enter the publication queue' });
      const publication = { id: `PUB-${String(publications.length + 185).padStart(6, '0')}`, proposalId: proposal.id, officialVersion: proposal.officialVersion, channels: body.channels || ['Academic Calendar', 'Student Portal'], status: 'Queued', queuedAt: new Date().toISOString() };
      publications.push(publication);
      await audit('Official version queued for publication', 'PublicationJob', publication.id, null, publication, 'Publication eligibility check passed', correlationId);
      return json(res, 201, publication);
    }
    const publicationDetailMatch = url.pathname.match(/^\/api\/publications\/([^/]+)(?:\/(results))?$/);
    if (req.method === 'GET' && publicationDetailMatch) {
      const scope = context?.institutionId || configuredInstitutionId;
      const records = databaseStatus().configured ? await listPublications(scope) : publications;
      const publication = records.find(item => item.id === publicationDetailMatch[1]);
      if (!publication) return json(res, 404, { error: 'Publication not found' });
      if (publicationDetailMatch[2] === 'results') return json(res, 200, { publicationId: publication.id, results: (publication.channels || []).map(channel => ({ channel, status: publication.status === 'Published' ? 'Acknowledged' : 'Pending', completedAt: publication.publishedAt || null })) });
      return json(res, 200, { source: 'authorized-publication-read-model', publication });
    }
    const publishMatch = url.pathname.match(/^\/api\/publications\/([^/]+)\/publish$/);
    if (req.method === 'POST' && publishMatch) {
      enforce(context, ['Publication Administrator', 'Curriculum Administrator']);
      if (databaseStatus().configured) {
        const publication = await publishPublication(context?.institutionId || configuredInstitutionId, publishMatch[1]);
        if (!publication) return json(res, 404, { error: 'Publication not found or Official version is unavailable' });
        await audit('Publication completed', 'PublicationJob', publication.id, 'Queued', publication, 'Publication result recorded', correlationId);
        return json(res, 200, publication);
      }
      const publication = publications.find(item => item.id === publishMatch[1]);
      if (!publication) return json(res, 404, { error: 'Publication not found' });
      publication.status = 'Published'; publication.publishedAt = new Date().toISOString();
      await audit('Publication completed', 'PublicationJob', publication.id, 'Queued', 'Published', 'Publication result recorded', correlationId);
      return json(res, 200, publication);
    }
    const unitMatch = url.pathname.match(/^\/api\/academic-units\/([^/]+)$/);
    if (req.method === 'PATCH' && unitMatch) {
      enforce(context, ['Curriculum Administrator', 'Academic Structure Administrator']);
      if (databaseStatus().configured) {
        const body = await readBody(req);
        if (!body.name || !body.effectiveFrom) return json(res, 400, { error: 'name and effectiveFrom are required' });
        const updated = await renameAcademicUnit(context?.institutionId || configuredInstitutionId, unitMatch[1], body.name, body.effectiveFrom);
        if (!updated) return json(res, 404, { error: 'Academic Unit not found' });
        await audit('Academic Unit renamed', 'AcademicUnit', updated.id, { id: updated.previousId, name: updated.previousName }, updated, 'Database-backed effective-dated Academic Unit version', correlationId);
        return json(res, 200, updated);
      }
      const unit = academicUnits.find(item => item.id === unitMatch[1]);
      if (!unit) return json(res, 404, { error: 'Academic Unit not found' });
      const body = await readBody(req);
      if (!body.name || !body.effectiveFrom) return json(res, 400, { error: 'name and effectiveFrom are required' });
      const previous = { name: unit.name, status: unit.status, currentSince: unit.currentSince };
      const previousVersion = unit.versions.find(v => v.effectiveTo === null);
      if (previousVersion) previousVersion.effectiveTo = new Date(new Date(body.effectiveFrom).getTime() - 86400000).toISOString().slice(0, 10);
      unit.name = body.name; unit.currentSince = body.effectiveFrom; unit.status = body.name === previous.name ? 'Active' : 'Renamed';
      unit.versions.push({ name: body.name, effectiveFrom: body.effectiveFrom, effectiveTo: null });
      await audit('Academic Unit renamed', 'AcademicUnit', unit.id, previous, { name: unit.name, status: unit.status, currentSince: unit.currentSince }, undefined, correlationId);
      return json(res, 200, unit);
    }
    return json(res, 404, { error: 'Route not found' });
  } catch (error) {
    const status = error.statusCode || 500;
    const message = status < 500 || process.env.NODE_ENV !== 'production' ? error.message : 'Internal server error';
    if (status >= 500) structuredLog({ event: 'http_error', correlationId, errorType: error.name || 'Error', status });
    return json(res, status, { error: message, correlationId });
  }
});

const port = Number(process.env.PORT || 8787);
server.listen(port, '0.0.0.0', () => console.log(`Northern Star CCMS API listening on http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await closeDatabase(); server.close(() => process.exit(0)); });
