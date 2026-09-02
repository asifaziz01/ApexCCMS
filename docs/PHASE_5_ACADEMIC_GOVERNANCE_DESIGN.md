# Phase 5 — Academic Governance Design

## Scope

Configurable committees, effective-dated membership, quorum and voting rules, governance routing, review actions, decisions, delegation, escalation, and traceable approval history.

My Reviews provides a scoped review packet for assigned proposals. Reviewers can inspect validation, requirements, outcomes, impact, and evidence, then record a rationale and decision. The decision is attributed to the actor and workflow stage and cannot bypass later configured approvals.

Committees expose effective-dated membership, voting eligibility, quorum, delegation, scope, and authority. A committee record is not itself an access grant; authorization remains constrained by the user’s institutional role, organizational scope, and current workflow stage.

Approvals provide a route-level register with current stage, due date, bottleneck indicators, and sequential decision boundaries. Each decision is linked to the proposal, workflow definition, actor, and audit history; only final approval enables Official Curriculum promotion.

## Entities

```text
committees
  id, institution_id, name, purpose, status, quorum_type, quorum_value
committee_memberships
  id, committee_id, user_id, membership_role, voting_status,
  effective_from, effective_to, status
governance_routes
  id, institution_id, proposal_type, name, status
governance_route_steps
  id, route_id, sequence, committee_id, required, due_days,
  branch_condition, escalation_policy
approval_instances
  id, proposal_id, route_id, status, started_at, completed_at
approval_steps
  id, approval_instance_id, route_step_id, status, assigned_to,
  decision, decided_at, comments
votes
  id, approval_step_id, voter_id, choice, cast_at, comment
governance_decisions
  id, proposal_id, authority, decision, decision_date, reference, comments
```

## Default configurable route

```text
Department Curriculum Committee
  -> Faculty Curriculum Committee
  -> Academic Programs Committee (APC)
  -> Senate Curriculum Committee
  -> Senate
```

The route is configuration data and may vary by institution and proposal type.

## Actions and controls

Reviewers may review, comment, recommend, approve, reject, request changes, or return. Quorum and voting validation occur server-side. Decisions link to the proposal and ultimately to the Official Curriculum Version created after final approval.

## Acceptance criteria

1. Committee membership is effective-dated and role-aware.
2. Quorum and voting rules are configurable.
3. The same proposal can be routed through configurable committee steps.
4. Returned/rejected decisions retain comments and audit history.
5. Approval authority and dates are traceable.
6. Governance decisions do not directly mutate Official Curriculum before final promotion.
