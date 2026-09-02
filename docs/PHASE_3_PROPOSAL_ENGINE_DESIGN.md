# Phase 3 — Proposal Engine Design

## Lifecycle invariant

```text
Proposal (workflow container)
  -> Proposed Curriculum Version (definition under review)
  -> Governance / QA / External review
  -> Final approval
  -> Official Curriculum Version (approved and immutable)
```

Proposal creation must never create or mutate Official Curriculum. Course and Program modifications start from the current official version and create the next proposed version.

## Proposal types

New Course, Course Modification, Course Discontinuation, New Program, Program Modification, Program Suspension, Program Closure, New Credential, and Credential Change.

## Proposal data

```text
proposal_id, institution_id, proposal_type, owner_user_id, academic_unit_id,
status, proposed_effective_term, rationale, evidence, workflow_instance_id,
created_at, submitted_at, completed_at
```

The proposal references one or more Proposed Curriculum Versions. Proposed versions contain the proposed curriculum data and validation results; they do not replace the official record.

## State machine

```text
Draft -> In Progress -> Submitted -> Under Review
                         ^              |
                         |              v
                      Resubmitted <- Returned

Submitted / Under Review -> Approved | Rejected | Withdrawn
```

## Acceptance criteria

1. New proposal creation produces a Proposal and Proposed Curriculum Version only.
2. Official curriculum is unchanged until required approval completes.
3. A modification creates proposed version N+1 and preserves official version N.
4. Submission validates required sections, effective dates, dependencies, and route.
5. Returned proposals retain comments and can be revised/resubmitted.
6. Proposal records and workflow history are auditable.
7. Consumer and publication reads exclude all proposed curriculum.
