# Northern Star CCMS — Architecture Validation Report

Status: Phase 0, pending product-owner approval  
Scope: Architecture and implementation planning only; no application code has been written.

## 1. Product summary

Northern Star CCMS is a multi-institution curriculum governance platform for Canadian colleges and universities. It is the system of record for curriculum definitions, versions, proposals, governance approvals, quality and external review, publication, history, oversight, and curriculum intelligence. SIS/Banner remains authoritative for operational records such as students, registrations, sections, CRNs, grades, and term offerings.

Core principle: create once, govern once, version correctly, publish everywhere.

## 2. Bounded modules and dependencies

| Module | Primary responsibility | Depends on |
|---|---|---|
| Platform Foundation | tenancy, institution, academic structure, identity, authorization, audit, reference data | — |
| Curriculum Core | stable Course, Program, Credential identities and versions | Platform |
| Requirements | structured reusable rules and wording generation | Curriculum Core |
| Learning Outcomes | outcomes, classification, mappings, evidence | Curriculum Core |
| Assessment | assessment components and institutional grading configuration | Curriculum Core, Platform |
| Proposals | proposal containers and proposed curriculum versions | Core, Requirements, Outcomes, Assessment |
| Governance | committees, routing, votes, decisions | Proposals, Platform |
| Quality / External | routing rules, pathways, cases, packages, reviewers, decisions, conditions, history | Proposals, Governance, Documents |
| Publications | queue, validation, channels, distribution, reconciliation | Official Curriculum, read models |
| Consumer | authorized public/student/faculty curriculum search and detail | Published read model |
| Oversight / Reporting | issues, dashboards, drill-down reports | operational records, read models |
| Integrations | generic mappings, staging, review queue, adapters, sync history | Platform, Core |
| Curriculum Intelligence | impact, exploration, health, comparison, lab, regulatory intelligence, advisory assistant | authoritative Core and read models |

Recommended architecture: modular monolith first, with explicit module boundaries and domain services. Add separate services only where operational scale or isolation requires it.

## 2A. Canonical application leftbar

The application uses one standard leftbar across all roles, modules, and pages. Navigation visibility is permission-filtered, but the shell structure and section order remain consistent. Role-specific sidebars are not permitted.

```text
NORTHERN STAR CCMS

Dashboard

ACADEMIC / CURRICULUM
- Curriculum Home
- Courses
- Programs
- Credentials
- Requirements
- Learning Outcomes
- Curriculum Maps

PROPOSALS
- Create Proposal
- My Proposals

GOVERNANCE
- My Reviews
- Committees
- Approvals

QUALITY / EXTERNAL
- Dashboard
- External Review Queue
- Submission Packages
- Reviewer Assignments
- Decisions & Conditions
- External Bodies
- Renewals
- Approval / Regulatory History

PUBLICATIONS
- Dashboard
- Publication Queue
- Scheduled Releases
- Results & History
- Channel Configuration

CONSUMER
- Dashboard
- Search & Browse
- Academic Calendar
- Curriculum Changes

OVERSIGHT
- Dashboard
- Compliance & Issues
- Approvals Overview
- Quality Assurance
- Reports

CURRICULUM INTELLIGENCE
- Intelligence Home
- Impact Analyzer
- Curriculum Explorer
- Curriculum Health
- Compare Curriculum
- Curriculum Lab
- Regulatory Intelligence
- Curriculum Assistant

ADMINISTRATION
- Users & Roles
- Academic Structure
- Workflows
- Integrations
- Reference Data
- Settings
```

The shared shell should implement reusable navigation, active-route state, collapsible section behavior, accessible keyboard navigation, responsive handling, and authorization-aware item states. Hidden items must not be reachable through the UI, while server-side authorization remains authoritative.

## 3. Domain entity inventory

### Platform

Institution, Campus, Faculty/School, AcademicUnit, AcademicUnitVersion, AcademicUnitRelationship, User, Role, Permission, RoleAssignment, Scope, ReferenceData, Notification, Task, AuditEvent, Document, DocumentVersion, ExternalSystem, ExternalSystemMapping.

### Curriculum

Course, CourseVersion, Program, ProgramVersion, Credential, CredentialVersion, CourseProgramAssociation, Requirement, RequirementRule, LearningOutcome, OutcomeClassification, OutcomeMapping, Evidence, AssessmentConfiguration, AssessmentComponent, GradingScheme.

### Proposals and governance

Proposal, ProposedCurriculumVersion, ProposalSection, ProposalComment, ProposalTask, ValidationResult, Committee, CommitteeMembership, MembershipRole, Meeting, Agenda, ApprovalPath, ApprovalStep, ApprovalInstance, Vote, GovernanceDecision.

### Quality and external review

RoutingRule, RoutingCondition, ApprovalPathway, PathwayStep, RoutingSimulation, ExternalBody, ExternalReviewCase, SubmissionPackage, PackageSection, ReviewerProfile, ReviewerAssignment, ConflictOfInterest, InformationRequest, ExternalDecision, Condition, Renewal, ComplianceIssue.

### Integration and publication

IntegrationConnection, IntegrationRun, IntegrationStagingRecord, IntegrationReviewItem, MatchSuggestion, ReconciliationResult, PublicationTarget, PublicationJob, PublicationResult, PublicationReconciliation.

### Read and intelligence models

PublicCurriculumRecord, ConsumerSearchDocument, DashboardMetric, ReportDefinition, ImpactAnalysis, CurriculumHealthSnapshot, ComparisonSnapshot, CurriculumLabScenario, RegulatoryRule, RegulatoryChange, SimilarityResult, AssistantInteraction.

## 4. Curriculum identity and version model

Stable identities are immutable internal records, for example `CRS-000481` and `PRG-000184`. Visible institutional codes, Banner IDs, ministry IDs, accreditation references, and CRNs are attributes or mappings, never primary identity.

```text
Stable Course / Program / Credential identity
    -> Proposed Curriculum Version(s)
    -> Official Curriculum Version(s)
```

Versions carry status, version number, effective term/date, ownership context, approval reference, and publication status. Official versions are immutable. A modification creates the next proposed version and, after approval, a new official version; the prior official version remains historical.

## 5. Proposal lifecycle

```text
Proposal
  -> Proposed Curriculum Version
  -> Governance / QA / External review as applicable
  -> Final approval
  -> Official Curriculum Version
  -> Publication
```

The Proposal is the workflow/governance container. The Proposed Curriculum Version is the curriculum definition under review. The Official Curriculum Version is the approved, effective record. No proposal action may directly mutate an official version.

## 6. Ownership model

```text
Institution -> Faculty / School -> Academic Unit -> Program
                                           -> Course
```

Every Program has one owning Academic Unit. Every Course has one owning Academic Unit and may associate with multiple existing official or eligible proposed Programs. Course creation requires a `program_id` for each association and cannot create a Program implicitly.

Academic Unit names and organizational attributes are effective-dated; the stable Academic Unit identity survives renames and predecessor/successor changes.

## 7. Authorization model

Authorization evaluates:

```text
User + Role + Permission + Organizational Scope + Resource Context
```

Roles are configurable permission bundles, not hard-coded business logic. Scope may include institution, campus, faculty/school, Academic Unit, committee, case, document, or explicit assignment. All authorization is enforced server-side, with UI filtering as a convenience only.

External reviewers receive explicit, time-limited case/document access. Public and consumer queries use published read models and must never expose proposed curriculum.

## 8. State-machine inventory

### Proposal

Draft → In Progress → Submitted → Under Review → Returned → Resubmitted → Approved / Rejected / Withdrawn.

### Curriculum versions

Proposed → Approved → Effective → Superseded / Retired. Transitions are constrained by governance and effective dating.

### External cases

Preparing → Ready to Submit → Submitted → Under Review → Information Requested / Decision Pending → Conditions Open → Closed.

### Conditions

Created → In Progress → Evidence Prepared → AQRO Review → Submitted → Accepted → Closed.

### Publication

Queued → Validating → Ready → Scheduled / Publishing → Published / Failed → Reconciled.

### Integration review

Detected → Unmatched / Conflict → Investigating → Matched / Linked / Imported as Reference / Ignored → Reconciled.

Transitions, actors, timestamps, reasons, and audit events must be recorded.

## 9. Requirements, outcomes, and assessment

Requirements are persisted as structured expression trees supporting AND, OR, nesting, grades, credits, level, eligibility, permissions, exclusions, and duplicate-credit rules. Human-readable calendar wording is generated from the structure; free text is not the source of truth.

Learning outcomes are reusable objects supporting statement, Bloom’s classification, course/program mappings, institutional or accreditation frameworks, rationale, and evidence.

Assessment uses institutional grading-scheme configuration. Curriculum Creators may select configured grading schemes but may not redefine institutional grade ranges.

## 10. Governance and quality architecture

Governance uses configurable committees, memberships, quorum/voting rules, approval steps, decisions, delegation, escalation, and effective-dated routes. The default Northern Star route is Department Curriculum Committee → Faculty Curriculum Committee → APC → Senate Curriculum Committee → Senate, but labels and routing remain configuration data.

Quality routing separates:

```text
Routing Rule -> Approval Pathway -> Pathway Step Configuration -> Actual Case Workflow
```

Rules support AND/OR, priority, exceptions, actions, effective dates, and explainable evaluation. Simulation evaluates sample attributes without creating workflow records.

## 11. Banner/SIS integration

```text
Adapter -> Canonical DTO -> Staging -> Matching -> Mapping -> Review Queue -> Domain Service
```

Bootstrap imports to staging, normalizes, detects duplicates, suggests matches, requires administrator review, confirms CCMS identities, persists mappings, reconciles, and only then enables ongoing sync.

Persistent mappings survive terms and yearly offerings. CRNs remain SIS operational identifiers and do not create Courses. Unknown SIS records never create Official Curriculum automatically.

Generic mapping fields:

```text
institution_id, source_system, entity_type, ccms_entity_id,
external_entity_type, external_id, external_code,
effective_from, effective_to, status, metadata
```

## 12. API boundaries and events

REST-first APIs with OpenAPI contracts are recommended. Each bounded module owns its commands, validation, queries, and events. Cross-module writes occur through application services or commands, not direct table mutation.

Representative API areas: `/auth`, `/institutions`, `/academic-units`, `/courses`, `/programs`, `/credentials`, `/requirements`, `/outcomes`, `/proposals`, `/governance`, `/quality`, `/external-cases`, `/integrations`, `/publications`, `/consumer`, `/oversight`, `/intelligence`, `/documents`, `/audit`.

Representative events: `ProposalCreated`, `ProposalSubmitted`, `ProposalReturned`, `ProposedVersionCreated`, `GovernanceDecisionRecorded`, `OfficialVersionPromoted`, `VersionEffective`, `IntegrationRecordDetected`, `MappingConfirmed`, `PublicationQueued`, `PublicationCompleted`, `PublicationFailed`, `ReconciliationIssueCreated`, `ExternalDecisionRecorded`, `ConditionClosed`, and `AuditEventRecorded`.

## 13. Documents and audit

Document binaries use an object-storage abstraction; PostgreSQL stores metadata, versions, classification, ownership, access grants, hashes, and lifecycle state. Security levels are Public, Institutional, Confidential, and Restricted. External reviewers see only explicitly granted documents.

Audit records capture actor, role, scope, action, object, previous value, new value, timestamp, reason/comment, and source system. Official versions, closed regulatory history, closed submission packages, and publication history are immutable except through explicit amendment/correction events. Audit storage must be append-only or otherwise tamper-evident.

## 14. Publication and consumer architecture

Publication reads only approved/official curriculum, validates required content and approvals, distributes to configured channels, records retries/results, and reconciles downstream state. Proposed curriculum is never queued or published.

Consumer search and public APIs read from authorization-aware, publication-backed read models. Student/Faculty view changes presentation emphasis, not source eligibility. Proposed or unpublished records are excluded at query-model construction and API authorization layers.

## 15. Oversight and intelligence

Dashboards and analytics use read models rather than tightly coupling complex reporting to transactional tables. Drill-down links back to authorized source records.

Curriculum Intelligence is a value-added read/analysis layer, not a system of record. Curriculum Lab is sandboxed and can only convert a scenario into a Proposal. AI assistance is advisory and cannot approve, reject, or silently change governed records.

## 16. Recommended repository structure

```text
/
  apps/
    web/
    api/
    worker/
  packages/
    contracts/
    design-system/
    domain-kernel/
    config/
  modules/
    platform/
    curriculum/
    proposals/
    governance/
    quality/
    integrations/
    publications/
    consumer/
    oversight/
    intelligence/
  database/
    migrations/
    seeds/
  tests/
    unit/
    integration/
    e2e/
    security/
  infrastructure/
  docs/
```

Recommendation: use a workspace monorepo with a modular monolith, shared TypeScript contracts, PostgreSQL migrations, background workers, containerized local development, and CI-ready lint/type/test scripts.

## 17. Security, privacy, accessibility, and localization assumptions

Required: OIDC/OAuth2 authentication, SAML-ready integration path, tenant isolation, server-side scope authorization, IDOR protection, restricted document access, upload validation, secrets management, secure sessions/cookies, rate limiting where applicable, idempotent integration workers, and audit integrity.

Recommendations pending institutional policy: Canadian data residency requirements, retention schedules, privacy impact assessment, records-management classification, bilingual terminology/content strategy, WCAG target level, and provincial accessibility requirements.

## 18. Migration strategy

1. Configure institution and academic structure.
2. Connect Banner in staging mode.
3. Import and normalize reference data.
4. Match or create stable CCMS identities through review.
5. Persist mappings and effective dates.
6. Reconcile source counts and exceptions.
7. Enable governed ongoing sync.
8. After go-live, CCMS is authoritative for newly approved curriculum; SIS remains authoritative for operational records.

## 19. Testing strategy

Tests must cover unit/domain invariants, API contracts, database constraints, authorization and scope, integration mappings, worker idempotency, document access, accessibility, and end-to-end workflows.

Mandatory end-to-end scenarios include new Course through publication and Consumer search, modification with historical retention, new Program ownership, unknown Banner review, CRN reuse across terms, proposed-content exclusion, external reviewer isolation, scoped authorization, publication mismatch reconciliation, immutable closed history, and Curriculum Lab isolation.

## 20. Thin vertical slice

Recommended first milestone:

```text
Login
-> Academic Structure
-> Create New Course Proposal
-> Proposed Curriculum Version
-> Submit
-> Department / Faculty Approval
-> Final Approval
-> Official Curriculum Version
-> Publication Queue
-> Consumer Search
```

This validates the core identity, version, authorization, governance, publication, and read-model architecture before expanding into Quality / External and Intelligence modules.

## 21. Ambiguities and product-owner decisions

These are not invented rules; they require confirmation:

1. Initial tenant model: one college first or multi-institution SaaS from day one?
2. Canadian jurisdiction scope: institution/province-specific QA bodies and terminology to support in the first release.
3. Exact identity provider and SSO requirements.
4. Whether proposed Programs may be associated with new Courses before the Program is approved.
5. Exact governance routes by proposal type and institution.
6. Effective-term calendar model and date/term conflict policy.
7. Institutional grading schemes and grade-range ownership.
8. Required Banner objects and inbound/outbound ownership after go-live.
9. Document storage provider, retention, residency, and records-management requirements.
10. Public publication channels and whether website/SIS/degree-audit adapters are in MVP.
11. WCAG target, bilingual support, and localization requirements.
12. Notification providers and escalation policy.
13. Analytics platform and reporting retention requirements.

## 22. Implementation sequence

Phase 0 approval → Platform Foundation → Curriculum Core → Proposal Engine → Learning Outcomes → Governance → Quality / External → Publications → Consumer → Oversight → Integrations → Reporting / Analytics → Curriculum Intelligence → Hardening.

Each phase follows Understand → Design → Backend → UI → Verify → Freeze. No later phase should be started before the preceding phase is accepted.

## Approval gate

This report is ready for product-owner review. Application coding should not begin until the architecture, recommendations, and open decisions are approved or explicitly revised.
