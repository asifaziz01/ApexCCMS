# Phase 6C–6F — External Review Operations Design

## Submission package workflow

```text
Build Package -> Validate -> Preview -> Internal Sign-off
  -> Generate Package -> Mark Ready -> Submit / Record
```

Package validation checks curriculum completeness, governance approval, evidence, and external-body requirements. Package content is generated from structured CCMS records wherever possible.

## Reviewer assignment workflow

```text
Request Reviewers -> Receive Nominations -> Screen & Shortlist
  -> Confirm Reviewers -> Notify Reviewers -> Assignment Complete
```

Reviewer profiles include conflict-of-interest, confidentiality, invitation status, deadline, and secure temporary access. Access is limited to explicitly assigned cases/documents and expires by policy.

## Decisions and conditions

Decision options: Approved, Approved with Conditions, Conditional Approval, Further Information Required, Deferred, Declined, Withdrawn.

Conditions track owner, responsible person, due date, required evidence, AQRO oversight, and status:

```text
Created -> In Progress -> Evidence Prepared -> AQRO Review
  -> Submitted -> Accepted -> Closed
```

## Historical records

Closed cases preserve workflow, documents, reviewers, decisions, conditions, timeline, and audit. Historical records are immutable; corrections create amendment/correction events. Renewal reminders are configurable.

Reviewer assignments and external bodies are governed records. Reviewer records include expertise, jurisdiction, workload, conflict-of-interest assessment, confidentiality acknowledgement, assignment scope, and access expiry. External-body records include jurisdiction, review type, contact metadata, renewal dates, versioned submission requirements, templates, and effective dates. Changes are auditable and do not alter previously submitted packages.

Renewals and Approval / Regulatory History complete the external operations model. Renewals link prior decisions, evidence, reviewers, conditions, and new packages; history records preserve the curriculum version, decision, conditions, evidence references, actor, timestamp, and amendment events without overwriting the original record.

External Review Queue provides a case workspace for evidence checklists, reviewer assignments, deadlines, package status, and scoped external access. Case decisions and conditions remain linked to the underlying Official or Proposed version context and are retained in the immutable history register.

Submission Packages provide the controlled handoff from a case to an external body. Package validation checks required sections, evidence links, regulatory declarations, and internal sign-off before submission; package versions are preserved after submission.

Decisions & Conditions provides the follow-up register for external outcomes. Conditions, evidence submissions, responses, and resolution events remain linked to the original decision and never overwrite its historical record.

## Acceptance criteria

1. Package validation is explainable and blocks readiness when required data is missing.
2. Reviewer access is isolated and time-limited.
3. Decisions retain authority, date, reference, effective/review dates, letter, and comments.
4. Conditions retain ownership and evidence until accepted and closed.
5. Closing a case creates an immutable historical snapshot.

## Reviewer and external-body records

Reviewer assignments track nomination, screening, confirmation, notification, conflict of interest, confidentiality, limited case access, invitation status, deadline, and access expiry. External Body records track name, type, jurisdiction, province/territory, mandate, submission method, requirements, templates, review cycles, SLA, and active status.
