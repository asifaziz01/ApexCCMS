# Phase 12 — Curriculum Intelligence Design

## Boundary

Curriculum Intelligence is a value-added read and analysis layer over authoritative CCMS data. It is not a second system of record. Analysis may explain, compare, score, or recommend; governed changes must become Proposals.

Impact Analyzer accepts a governed curriculum source and reports affected programs, courses, outcomes, publication targets, students, and external cases. Findings are advisory and grounded in authorized relationships; the analyzer cannot modify or approve curriculum.

Curriculum Explorer traces a selected record through governed relationships and publication results. It is read-only and does not create relationships or mutate authoritative curriculum data.

Curriculum Health produces explainable indicators for outcome coverage, requirement structure, version integrity, publication readiness, and external traceability. Scores prioritize review work but do not alter records or replace institutional quality processes.

Compare Curriculum supports side-by-side comparison of official, proposed, and historical versions. It is read-only; identified differences can inform governed proposals and review decisions but cannot mutate the source records.

Curriculum Lab provides isolated what-if scenarios with validation and impact findings. A validated scenario may be converted into a Proposal, but sandbox changes never modify Official Curriculum directly.

Regulatory Intelligence stores effective-dated regulatory knowledge separately from operational cases. Potential impacts are advisory findings that may initiate review work or a governed Proposal; they cannot silently mutate curriculum.

Curriculum Assistant provides grounded advisory responses from authorized requirements, maps, proposals, and publication records. It must disclose sources and cannot approve, reject, or silently modify governed records.

## Initial build order

1. Intelligence Home
2. Impact Analyzer
3. Curriculum Explorer
4. Curriculum Health
5. Compare Curriculum
6. Curriculum Lab
7. Regulatory Intelligence
8. Curriculum Similarity
9. Curriculum Assistant

## Core models

```text
impact_analyses
  id, institution_id, source_type, source_id, affected_records,
  risk_summary, generated_at, generated_by
curriculum_health_snapshots
  id, institution_id, metric, score, rule_definition, findings, calculated_at
comparison_snapshots
  id, institution_id, left_record, right_record, differences, generated_at
curriculum_lab_scenarios
  id, institution_id, owner_id, changes, impact_summary, status
```

Health rules must be explainable. Curriculum Lab changes never affect Official Curriculum directly and may only be converted into a Proposal.

## Acceptance criteria

1. Impact analysis links to authorized source records and identifies affected programs, courses, outcomes, requirements, publications, and external approvals.
2. Health scores show their rule definitions and findings.
3. Compare views distinguish official, proposed, and historical versions.
4. Intelligence output is advisory and cannot approve, reject, or silently mutate governed records.
5. Sandbox scenarios remain isolated from official data.

## Remaining tool boundaries

Curriculum Lab is a sandbox for ideas, simulated changes, impact analysis, and validation. It can convert a scenario into a Proposal but cannot modify Official Curriculum directly.

Regulatory Intelligence is an effective-dated knowledge and planning layer separate from operational external approval cases.

Curriculum Assistant may summarize, explain, find possible duplicates, improve wording, and explain validation errors. It is advisory; generated output cannot approve, reject, or silently modify governed records.
