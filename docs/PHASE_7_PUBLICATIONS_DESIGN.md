# Phase 7 — Publications Design

## Workflow

```text
Official Curriculum
  -> Publication Queue
  -> Publication Workspace
  -> Preview / Channels / Schedule / Validation
  -> Publish or Schedule
  -> Results
  -> Reconciliation

The Publication Workspace validates channel readiness and exposes a governed publish action. Only Official Curriculum Versions may enter the workspace; publication records capture channels, actor, validation, schedule, visibility, and result history.

Channel Configuration manages destination scope, content mappings, credentials, connection health, and reconciliation controls. Channel configuration is versioned and cannot authorize publication of Proposed or unpublished curriculum.

Scheduled Releases provide a calendar and job register for upcoming channel distributions. Jobs retain the selected Official version, channel window, validation state, schedule, actor, and per-channel result.

Results & History provides per-channel acknowledgements and reconciliation outcomes. Release records are immutable; follow-up findings are appended as explicit events for audit and operational resolution.
  -> Immutable History
```

## Rules

- Only Official Curriculum Versions may enter the publication queue.
- Proposed Curriculum Versions are never publishable.
- Each downstream channel has configured capabilities and validation rules.
- Publication jobs are idempotent and retryable.
- Downstream mismatches create reconciliation issues; they never overwrite Official Curriculum.

## Entities

```text
publication_targets
  id, institution_id, name, channel_type, endpoint_config, status
publication_jobs
  id, official_version_id, target_id, status, scheduled_at, started_at, completed_at
publication_results
  id, job_id, downstream_id, status, response_summary, completed_at
publication_reconciliations
  id, job_id, issue_type, expected_value, actual_value, status, resolved_at
```

## Acceptance criteria

1. Proposed curriculum cannot be queued or published.
2. Workspace validation reports missing content, approvals, and channel requirements.
3. Scheduled jobs retain schedule, actor, channel, result, retries, and history.
4. Publication failures and downstream mismatches create actionable records.
5. Publication history is immutable.
