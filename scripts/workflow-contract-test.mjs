const base = process.env.CCMS_API_URL || 'http://localhost:8787';

async function request(path, options) {
  const response = await fetch(`${base}${path}`, options);
  const body = await response.json();
  if (!response.ok) throw new Error(`${options?.method || 'GET'} ${path} returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

const structure = await request('/api/academic-structure');
const academicUnitId = structure.academicUnits.find(unit => unit.name === 'School of Technology')?.id || structure.academicUnits[0]?.id;
const types = ['New Requirement', 'New Course', 'Course Modification', 'New Program', 'Program Modification', 'New Credential'];
const created = [];
for (const proposalType of types) {
  const proposal = await request('/api/proposals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposalType, title: `${proposalType} workflow contract`, academicUnitId, effectiveTerm: 'Fall 2026', requirementId: proposalType === 'New Requirement' ? `REQ-TEST-${created.length + 1}` : undefined, details: { owner: 'School of Technology' } }) });
  if (!proposal.id || !['Submitted', 'Under Review'].includes(proposal.status)) throw new Error(`${proposalType} did not submit`);
  const firstWorkflow = await request(`/api/proposals/${proposal.id}/workflow`);
  const secondWorkflow = await request(`/api/proposals/${proposal.id}/workflow`);
  if (!firstWorkflow.workflow || firstWorkflow.workflow.id !== secondWorkflow.workflow.id) throw new Error(`${proposalType} created duplicate or missing workflow`);
  if (firstWorkflow.steps.length !== 4 || firstWorkflow.steps[0].committee !== 'Department Curriculum Committee' || firstWorkflow.steps[0].status !== 'IN_PROGRESS') throw new Error(`${proposalType} route was not instantiated correctly`);
  if (!firstWorkflow.workItems.some(item => item.proposalId === proposal.id && item.committee === 'Department Curriculum Committee')) throw new Error(`${proposalType} approval work item was not created`);
  const approvals = await request('/api/approvals');
  if (!approvals.workItems.some(item => item.proposalId === proposal.id)) throw new Error(`${proposalType} is missing from approvals`);
  const committee = await request('/api/committees/Department%20Curriculum%20Committee/workload');
  if (!committee.workItems.some(item => item.proposalId === proposal.id)) throw new Error(`${proposalType} is missing from committee workload`);
  created.push(proposal);
}

let current = created[0];
for (let step = 1; step <= 4; step += 1) {
  current = await request(`/api/proposals/${current.id}/advance`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const workflow = await request(`/api/proposals/${current.id}/workflow`);
  if (step < 4 && workflow.workflow.currentStep !== step + 1) throw new Error('Approval did not advance exactly one configured stage');
}
if (current.status !== 'Approved') throw new Error('Final approval did not complete the workflow');
const beforePromotion = await request(`/api/proposals/${current.id}`);
if (beforePromotion.status !== 'Approved' || beforePromotion.officialVersion) throw new Error('Official curriculum was created before promotion');
const promoted = await request(`/api/proposals/${current.id}/promote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
if (promoted.status !== 'Official') throw new Error('Approved proposal did not promote to Official');

console.log(JSON.stringify({ ok: true, proposalTypes: types, workflowSteps: 4, approvalQueue: true, committeeWorkload: true, finalPromotion: true }));
