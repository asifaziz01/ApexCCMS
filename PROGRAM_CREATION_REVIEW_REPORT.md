# Northern Star CCMS — Program Creation Review Report

**Review date:** 2026-09-01  
**Environment:** Local test environment (`http://localhost:5173/`)  
**Reviewer scope:** Program creation, governance record creation, QA readiness, and reporting

## Executive summary

The program data model and API can create a governed `New Program` proposal with an owning Academic Unit, effective term, proposed version, and structured program details. A real test record was created successfully.

The browser workflow is incomplete. The Programs page displays a `Create Program Proposal` action, but it is not connected to a program creation wizard. The New Proposal page displays a `New Program` option, but that option has no action handler. As a result, users cannot create the same real program record through the UI yet.

## Real-data verification

The following realistic Canadian-college program payload was submitted to `POST /api/proposals`:

| Field | Value |
|---|---|
| Proposal type | New Program |
| Title | Advanced Diploma in Cybersecurity |
| Program code | CYBR-ADV-DIP |
| Credential | Advanced Diploma |
| Academic Unit | School of Technology (`AU-000057`) |
| Effective term | Fall 2027 |
| Duration | 6 terms |
| Total credits | 90 |
| Delivery | Hybrid |
| Admission requirements | Ontario Secondary School Diploma or equivalent; Grade 12 English |
| Learning outcomes | Secure networked systems; respond to cybersecurity incidents; apply privacy, risk, and governance controls |

**Result:** `201 Created`  
**Record:** `PROP-000186`  
**Status:** `Submitted`  
**Proposed version:** `v1.0`  
**Workflow stage:** Department Curriculum Committee

The returned record contains the structured details under `details`, confirming that the API is not limited to a title-only placeholder.

## Process review

### Working

- Proposal records are scoped to an institution.
- Program proposals are classified as `Program` curriculum items by the repository.
- An Academic Unit is required by the API contract.
- Effective term, proposal type, title, proposed version, status, and governance stage are recorded.
- Structured program details are stored in the proposed curriculum version payload when PostgreSQL is configured.
- The approval route has the expected staged governance sequence: Department, Faculty, Academic Programs Committee, Senate Curriculum Committee, and Senate.

### Not connected or incomplete

- Programs page `Create Program Proposal` action has no program-specific handler.
- New Proposal page `New Program` choice has no `onClick` workflow.
- No program wizard exists for credential, duration, credits, delivery, admission requirements, outcomes, course sequence, resources, or external/accreditation references.
- The current Programs catalogue is a static demo array and does not reload newly created proposals.
- No program-specific client validation is present for credits, term, admission requirements, outcome coverage, or course sequencing.
- No visible QA gate prevents submission when outcomes, resources, credential relationships, or labour-market evidence are incomplete.
- Reporting screens use static/demo metrics and are not connected to the created program proposal.

## QA and reporting assessment

The tested API record is governance-safe at the proposal level: it remains `Submitted` and is not treated as Official Curriculum. However, program QA is not yet enforceable in the UI. A production-ready program workflow should validate at minimum:

1. Stable program code and title uniqueness within the institution.
2. Academic Unit ownership and effective-dated ownership.
3. Credential relationship and award eligibility.
4. Credit total, term sequence, contact hours, and course availability.
5. Admission requirements and progression rules.
6. Program learning-outcome coverage and curriculum mapping.
7. Faculty, resource, placement, accessibility, and privacy impact evidence.
8. Canadian regulatory or external-body review requirements where applicable.
9. Approval route assignment and immutable audit events.
10. Publication readiness only after final approval and official-version promotion.

The report should eventually consume live proposal, version, outcome, requirement, approval, QA issue, and publication data rather than fixed dashboard counts.

## Recommended implementation order

1. Build a `ProgramProposalWizard` and connect both `Create Program Proposal` entry points.
2. Add controlled program fields and client/server validation.
3. Persist program-specific details and related structured records, not only a JSON summary.
4. Add automated QA checks and block submission on errors while allowing documented warnings.
5. Load the Programs catalogue and reporting views from the proposal/version APIs.
6. Add an end-to-end regression test: create → QA → staged approval → promote official → publish → consumer visibility.

## Verification commands

```text
npm run build
npm run test:ui-contract
npm run test:production-errors
GET  http://localhost:8787/api/health
POST http://localhost:8787/api/proposals
```

## Environment note

The local API currently reports `in-memory-demo` because PostgreSQL is not configured. The test record is real within the running local API process but will not survive an API restart until PostgreSQL is configured and migrations are applied.
