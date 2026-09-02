const base = process.env.CCMS_API_URL || 'http://localhost:8787';

async function request(path, options) {
  const response = await fetch(`${base}${path}`, options);
  const body = await response.json();
  if (!response.ok) throw new Error(`${options?.method || 'GET'} ${path} returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

const health = await request('/api/health');
if (health.status !== 'ok') throw new Error('Health check did not return ok');

const structure = await request('/api/academic-structure');
const academicUnitId = structure.academicUnits.find(unit => unit.effectiveTo === null)?.id || structure.academicUnits[0]?.id;
if (!academicUnitId) throw new Error('No Academic Unit available for smoke test');
const proposal = await request('/api/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposalType: 'New Course', title: 'SMOKE TEST — Governed Course', academicUnitId, effectiveTerm: 'Fall 2026' }) });
if (proposal.status !== 'Submitted') throw new Error('Proposal was not submitted');

let current = proposal;
for (let i = 0; i < 6; i += 1) current = await request(`/api/proposals/${proposal.id}/advance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
if (current.status !== 'Approved') throw new Error('Proposal did not reach Approved');

current = await request(`/api/proposals/${proposal.id}/promote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
if (current.status !== 'Official') throw new Error('Proposal did not promote to Official');

const publication = await request('/api/publications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposalId: proposal.id, channels: ['Academic Calendar', 'Student Portal'] }) });
if (publication.status !== 'Queued') throw new Error('Official version was not queued');

const published = await request(`/api/publications/${publication.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
if (published.status !== 'Published') throw new Error('Publication did not complete');

const consumer = await request('/api/consumer');
if (!consumer.records.some(record => record.publicationId === publication.id)) throw new Error('Published record was not visible to consumer read model');

console.log(JSON.stringify({ ok: true, proposalId: proposal.id, publicationId: publication.id, consumerVisible: true }));
