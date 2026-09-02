# Phase 8 — Consumer Design

## Source boundary

Consumer search, detail, calendar, and change views read from publication-backed models containing Official + Published curriculum only. Proposed or unpublished curriculum is excluded during read-model construction and at the API authorization boundary.

When PostgreSQL is configured, `/api/consumer` joins publications to curriculum versions and requires `status = 'Published'`, `visibility = 'Public'`, and `lifecycle_state = 'Official'`; the in-memory result is retained only for local demonstration mode.

The Search & Browse experience supports published result discovery and a detail state for programs and courses. Detail views expose identity, effective term, structure, and publication metadata while keeping drafts, reviewer notes, and internal governance history private.

## Views

- Consumer Dashboard
- Search & Browse
- Course / Program Detail
- Academic Calendar & Changes
- Optional saved items

The Student / Faculty switch changes emphasis and context, not source eligibility. Default ranking prioritizes Programs, Program Requirements, Courses, and Academic Calendar; exact course-code matches may promote Courses.

## Read models

```text
public_curriculum_records
  id, institution_id, official_version_id, record_type, title, code,
  summary, effective_from, effective_to, published_at, channels
consumer_search_documents
  id, public_record_id, searchable_text, ranking_fields, audience_facets
calendar_change_records
  id, public_record_id, change_type, effective_term, summary, published_at
```

## Acceptance criteria

1. Consumer APIs return only Official + Published records.
2. Proposed Curriculum Versions never appear in search, detail, or calendar results.
3. Search is authorization-aware and supports exact code matching.
4. Calendar changes show effective term and published change summary.
5. Student/Faculty view changes presentation emphasis without changing data eligibility.
