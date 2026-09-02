# Phase 4 — Learning Outcomes Design

## Workflow

```text
Outcome Statement
  -> Classification
  -> Mapping
  -> Rationale & Evidence
  -> Review
  -> Save & Complete
```

## Data model

```text
learning_outcomes
  id, institution_id, ccms_id, owner_type, owner_id, statement,
  outcome_type, status, created_at, updated_at
outcome_classifications
  outcome_id, framework, taxonomy, level, classified_by, classified_at
outcome_mappings
  id, outcome_id, target_type, target_id, mapping_type, emphasis, rationale
evidence
  id, institution_id, outcome_id, category, document_id, description,
  uploaded_by, uploaded_at, status
```

## Rules

- Learning Outcomes are reusable curriculum objects.
- Primary and Secondary Outcome Statements are distinct fields.
- Bloom’s Taxonomy classification is structured data.
- Mappings may target Course Learning Outcomes, Program Learning Outcomes, institutional frameworks, or accreditation standards where applicable.
- Rationale and evidence remain linked to the outcome and proposal/version context.
- Outcome changes inside governed curriculum occur through a Proposal and Proposed Curriculum Version.

## Acceptance criteria

1. An outcome can move through each workflow step while retaining draft state.
2. Classification and mappings are structured, queryable data.
3. Evidence access follows document classification and user scope.
4. Review identifies incomplete statements, missing classification, unmapped outcomes, and missing evidence where required.
5. Official outcome history remains immutable after approval.
