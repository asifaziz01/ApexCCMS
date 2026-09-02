# Phase 2 — Curriculum Core Design

## Scope

Stable Course, Program, and Credential identities; ownership; associations; effective-dated versions; and structured requirements foundations. Proposal workflows remain Phase 3.

Curriculum Home provides the canonical entry point for browsing these governed catalogue domains and exposes integrity indicators without duplicating authoritative records.

## Invariants

- CCMS identity is immutable and independent from Banner/SIS identifiers.
- Every Program belongs to one owning Academic Unit.
- Every Course belongs to one owning Academic Unit.
- Courses may associate with multiple existing official or eligible proposed Programs.
- Course creation cannot implicitly create a Program.
- Approved curriculum versions are immutable.
- CRNs identify term/section operations in SIS and never identify Courses.

## Core relational model

```text
courses
  id, institution_id, ccms_id, owning_academic_unit_id, subject_code,
  course_number, status, created_at, updated_at
course_versions
  id, course_id, version_number, status, effective_from, effective_to,
  title, description, credits, academic_level, governance_reference
programs
  id, institution_id, ccms_id, owning_academic_unit_id, program_code,
  credential_id, status, created_at, updated_at
program_versions
  id, program_id, version_number, status, effective_from, effective_to,
  name, credits, admission_requirements, graduation_requirements
credentials
  id, institution_id, ccms_id, credential_type, level, status
course_program_associations
  id, course_id, program_id, association_type, effective_from, effective_to, status
external_system_mappings
  id, institution_id, source_system, entity_type, ccms_entity_id,
  external_entity_type, external_id, external_code, effective_from, effective_to,
  status, metadata
```

## API boundaries

```text
GET  /api/courses
GET  /api/courses/:id
GET  /api/courses/:id/versions
GET  /api/programs
GET  /api/programs/:id
GET  /api/programs/:id/versions
GET  /api/credentials
GET  /api/courses/:id/program-associations
```

Creation and modification commands will be proposal-owned in Phase 3. Direct mutation of official curriculum is not permitted.

## Acceptance criteria

1. A Course retains its CCMS ID when its Banner mapping changes.
2. A Program cannot be created without an owning Academic Unit.
3. Course associations require existing Program identities.
4. Different yearly CRNs resolve to one Course identity.
5. Official version history remains unchanged when a new version becomes effective.
6. Effective-date overlaps are rejected.
7. Public reads return only official/published records.

The academic catalogue includes governed Credential records, structured Requirements, and Curriculum Maps. Credentials define award types and program relationships; requirements are stored as structured expressions with human-readable previews; maps link courses, program outcomes, credential requirements, and evidence without duplicating authoritative records. All three preserve versioning, effective dates, ownership, and audit history.
