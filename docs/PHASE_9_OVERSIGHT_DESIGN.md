# Phase 9 — Oversight Design

## Purpose

Oversight provides institution-wide monitoring of compliance, approvals, quality assurance, publication, and integration health. It is a read-optimized oversight layer with actionable drill-down to authorized source records.

Reports provide saved definitions, scheduled outputs, and run history. Every report run records the definition, actor, filters, output, and authorization checks; exports contain only records the current user is permitted to view.

## Views

- Oversight Dashboard
- Compliance & Issues
- Approvals Overview
- Quality Assurance Overview
- Oversight Reports & Drill-down

Default saved compliance view: `My Open Issues`. Drill-down opens in a right-side contextual panel by default.

## Issue model

```text
compliance_issues
  id, institution_id, issue_type, severity, source_type, source_id,
  owner_id, status, detected_at, due_at, resolution, resolved_at
```

Automated checks include inactive prerequisites, inconsistent program credits, retired course references, unmapped outcomes, SIS mismatch, and publication mismatch. Downstream mismatches never overwrite Official Curriculum.

## Acceptance criteria

1. KPIs derive from real operational/read-model records.
2. Issues link to source records and preserve detection/resolution history.
3. Severity, ownership, due dates, and corrective actions are visible.
4. Drill-down respects authorization scope.
5. Reports and exports use reusable read models, not fragile page-specific queries.
