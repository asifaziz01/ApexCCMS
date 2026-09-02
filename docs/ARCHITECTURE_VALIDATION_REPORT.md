# Northern Star CCMS — Architecture Validation Report

This report records the architecture decisions applied from the Master Handoff and Execution Playbook. The attached documents are specification inputs; this report is an implementation record, not a replacement for institutional policy approval.

## Core invariants

- Proposal, Proposed Curriculum Version, and Official Curriculum Version are separate concepts.
- Official versions are immutable and only become publishable after configured governance approval.
- CCMS identifiers are internal and stable; Banner identifiers, government identifiers, accreditation identifiers, and CRNs are external references.
- Programs and Courses are owned by Academic Units. Course creation references existing Programs and never implicitly creates one.
- Proposed or unpublished curriculum is excluded from Consumer/public publication paths.
- Unknown SIS/Banner records enter integration review and cannot become Official Curriculum automatically.
- Curriculum Intelligence is advisory and cannot approve or mutate governed curriculum.

## Bounded modules and dependencies

Platform and Administration provide institution, academic structure, identity, roles, permissions, reference data, integrations, and audit. Curriculum Core owns stable identities and versions. Proposals and Governance create the controlled lifecycle. Quality/External adds routing and review cases. Publications create channel jobs and results. Consumer reads the published model. Oversight and Intelligence consume authorized, version-aware read models.

## Persistence and API boundary

The application is a modular monolith. PostgreSQL is the system-of-record target, with tenant-scoped parameterized repositories. The local memory store is explicitly a development fallback. The API exposes health/readiness, curriculum workflow, evidence metadata, jobs, publications, consumer reads, and audit reads. Mutating routes must authenticate, authorize tenant/role scope, validate input, and append audit evidence.

## Security and privacy assumptions

OIDC/OAuth2 bearer validation is provided through a JWKS boundary; production requires a configured issuer, audience, tenant claim, role/scope mapping, TLS termination, secret management, and institutional identity review. Evidence contents belong in approved object storage, while PostgreSQL stores metadata and protected keys. The deployment must complete a Canadian privacy impact assessment, residency decision, retention schedule, records-management decision, WCAG 2.2 AA review, and English/French content review.

## Remaining implementation gates

The local repository cannot provision a college's PostgreSQL, OIDC provider, object-storage scanner, durable worker runtime, observability platform, backup service, or policy approvals. Those gates are operationally documented in `docs/DEPLOYMENT_RUNBOOK.md`, `docs/PRIVACY_ACCESSIBILITY_BILINGUAL_CHECKLIST.md`, and `docs/PHASE_13_HARDENING_CHECKLIST.md` and are reported by `/api/readiness` where configuration can be detected.
