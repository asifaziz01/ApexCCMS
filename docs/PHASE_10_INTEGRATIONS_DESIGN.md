# Phase 10 — Integrations Design

## Architecture

```text
External Adapter -> Canonical Integration DTO -> Staging
  -> Matching Service -> Mapping Service -> Integration Review Queue
  -> Domain Service -> Reconciliation
```

The generic layer supports Banner, Workday, PeopleSoft, Colleague, HR, Degree Audit, LMS, and other systems. Banner-specific fields remain in the adapter/DTO layer, not core curriculum tables.

## Bootstrap

Connect → Stage → Normalize → Detect duplicates → Suggest matches → Administrator review → Confirm CCMS identities → Persist mappings → Reconcile → Enable ongoing sync.

Unknown Programs, Courses, Academic Units, and other curriculum records never automatically become Official Curriculum.

## Persistent mapping

`ExternalSystemMapping` stores institution, source system, entity type, CCMS identity, external identity/code, effective dates, status, and metadata. Term-specific CRNs remain SIS operational records and do not create Courses.

## Acceptance criteria

1. Mappings persist across terms and yearly offerings.
2. Unknown records enter Integration Review rather than bypassing governance.
3. Conflicts retain source values and proposed resolution.
4. Sync runs are idempotent, retryable, and auditable.
5. Reconciliation mismatches create issues without overwriting CCMS Official Curriculum.

## Prototype implementation status

The Integrations workspace now provides interactive Overview, Mappings, Unmatched, Conflicts, and Sync History views. The local demonstration includes Banner mapping examples, explicit conflict review, a visible sync action, and safeguards that keep unknown records out of Official Curriculum. Persistent adapter execution and database-backed mapping storage remain production work.
