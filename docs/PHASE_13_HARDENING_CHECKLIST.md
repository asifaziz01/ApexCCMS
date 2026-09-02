# Phase 13 — Hardening Checklist

## Current foundation checks

- [x] Production frontend build succeeds.
- [x] API health endpoint responds.
- [x] Academic Unit effective-dated mutation creates an audit event.
- [x] Canonical navigation is shared across modules.
- [x] Consumer views visibly distinguish Official + Published content.
- [x] Intelligence views are labeled advisory.

## Required before production

Persistence scaffolding is available in `db/migrations/001_initial_schema.sql`, `.env.example`, and `server/repositories.js`. Read routes use PostgreSQL when `DATABASE_URL` is configured; the local fallback remains intentionally in-memory for visual testing.

Local PostgreSQL bootstrap is available through `docker-compose.yml`; the database instructions are in `db/README.md`.

OIDC/JWT verification scaffolding is available in `server/auth.js`. Production wiring must require bearer authentication on protected routes and map `institution_id` / tenant claims plus roles and scopes to server-side authorization checks.

Tenant-scoped repository scaffolding is available in `server/repositories.js`; route migration remains gated on PostgreSQL availability, seed data, and authenticated request context.

Reusable authorization policies are available in `server/authorization.js` for institution matching, role checks, and scope checks. Protected routes must invoke these policies after OIDC authentication and before repository access.

The core vertical slice has a repeatable smoke test at `scripts/smoke-test.mjs`, available as `npm run test:smoke`.

Dependency security scanning is available as `npm run test:security`; the current dependency tree reports zero high or critical advisories. Repeat this scan in CI and before each release.

Platform boundary checks are available at `scripts/platform-smoke-test.mjs`, available as `npm run test:platform`. They cover health/readiness, correlation IDs, validation rejection, evidence metadata registration, and job enqueue/list behavior.

Authorization policy checks are available as `npm run test:authorization`; they cover tenant mismatch, role mismatch, scope mismatch, and anonymous denial.

The canonical shell contract is checked by `npm run test:ui-contract`, covering shared sections, required navigation labels, bilingual toggle, skip link, and main landmark.

The API emits `X-Correlation-ID` on responses and applies a bounded, configurable in-memory rate limit per client address. Production should replace this with distributed rate limiting and structured log correlation.

The API now emits structured JSON request logs containing service, method, path, status, correlation ID, and duration. Request bodies, authorization headers, and secrets are intentionally excluded. `PORT` and `CORS_ORIGIN` are configurable, database shutdown is graceful, `/api/metrics` exposes operational counters, mutation content types are enforced, and database-backed evidence registration refuses to operate without an evidence-storage provider.

The frontend delivery configuration also supplies CSP, framing, content-type, referrer, and permissions headers for dev/preview servers; the production reverse proxy/CDN must preserve or strengthen them.

Unexpected production failures return a generic correlation-linked message while structured logs retain only error type/status, avoiding database or infrastructure detail disclosure.

Production error sanitization is regression-tested with `npm run test:production-errors`.

JSON mutation bodies are bounded by configurable 16 KB–10 MB limits and malformed JSON receives a controlled 400 response. Oversized payloads receive 413 before mutation logic proceeds.

API authentication enforcement is opt-in through `REQUIRE_AUTH=true`. Health remains public for operations; all other `/api/*` routes require a valid OIDC bearer token when the switch is enabled.

- [x] Add PostgreSQL migrations and tenant-scoped repositories for the persisted API paths; local in-memory mode is retained only for visual review.
- [~] Implement OIDC/OAuth2 login and server-side authorization middleware. JWT verification and mutation-route role enforcement are implemented; production identity-provider configuration remains.
- [~] Enforce tenant and organizational scope on persisted API queries/mutations; production tenant provisioning and claim-policy validation remain an institutional deployment gate.
- [x] Document the bearer-token CSRF decision; cookie sessions require SameSite controls and CSRF tokens before introduction.
- [~] Add bounded/configurable rate limiting, structured logging, correlation IDs, and environment-based secret boundaries; distributed rate limiting and secret-manager integration remain deployment work.
- [~] Add upload metadata validation, protected storage-key responses, provider boundary, malware-scan state, encryption-key reference, and retention fields; real object storage and malware service integration remain.
- [~] Carry governed `Public`/`Internal`/`Confidential`/`Restricted` privacy classifications on evidence and audit records; institutional classification policy and review remain.
- [~] Add append-only/tamper-evident audit persistence. Audit schema and both local/PostgreSQL append paths carry a hash chain; migration `004_immutability_triggers.sql` rejects update/delete for audit and publication-result history. Production still requires database permissions and an independent verification job.
- [~] Add idempotent background workers and retry/dead-letter handling. `/api/jobs` has a PostgreSQL-backed queue schema and idempotency key; `server/worker.js` and `npm run worker` provide row-locking claim, retry, dead-letter runtime, and an evidence-retention handler. Production still requires supervised deployment and scheduler configuration.
- [x] Add automated smoke, platform, authorization, signed-JWT, UI-contract, dependency-audit, server-regression, production-error, production-config, deployment, backup-contract, build, PostgreSQL integration, database-contract, and audit-verifier checks.
- [~] Add WCAG shell foundations, keyboard/focus support, localization and bilingual navigation; full page translation and institutional assistive-technology audit remain.
- [ ] Complete privacy impact assessment, residency, retention, and records-management decisions with the institution.
- [~] Add observability, backup/restore, disaster recovery, and deployment runbooks. Metrics, structured logs, migration/seed, backup, and guarded restore scripts are present; institutional backup schedules, alerting, RTO/RPO, and recovery drills remain required.

## Demo readiness boundary

The current local preview is suitable for visual and workflow-prototype review. `/api/readiness` is the runtime gate and performs a live PostgreSQL connectivity check; `npm run check:production` is the configuration gate. Both must pass before deployment. Institutional infrastructure and policy sign-off remain required.
