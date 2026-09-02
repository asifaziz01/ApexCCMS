# Phase 6A/6B — Quality & External Routing Design

## Architecture

```text
Routing Rule
  -> Approval Pathway
  -> Pathway Step Configuration
  -> Actual Case Workflow
```

Routing rules are effective-dated configuration. They support AND/OR conditions, priority, exceptions, actions, and explainable evaluation. A simulation evaluates sample proposal attributes without creating a real workflow.

## Entities

```text
routing_rules
  id, institution_id, name, priority, status, effective_from, effective_to,
  condition_tree, action_config, explanation
approval_pathways
  id, institution_id, name, proposal_type, status, effective_from, effective_to
pathway_steps
  id, pathway_id, sequence, name, owner_type, required, decision_method,
  assignee_resolver, due_days, branch_condition, escalation_config
routing_simulations
  id, actor_user_id, sample_attributes, matched_rules, selected_pathway,
  executed_steps, skipped_steps, resolved_assignees, evidence_requirements
external_review_cases
  id, institution_id, proposal_id, external_body_id, case_owner_id,
  status, submitted_at, decision_due_at, closed_at
```

## External case statuses

Preparing → Ready to Submit → Submitted → Under Review → Information Requested / Decision Pending → Conditions Open → Closed.

## Acceptance criteria

1. Routing is explainable: users can see matched rules and why a pathway was selected.
2. Required and optional steps, branches, skips, escalation, and delegation are represented as configuration.
3. Simulation never creates an approval or external case.
4. External cases preserve proposal, governance, documents, reviewers, decisions, conditions, timeline, and audit.
5. External reviewer access is explicitly granted and time-limited.
6. Case closure preserves immutable historical records and future renewal/review dates.
