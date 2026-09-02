# Northern Star CCMS — Prototype Validation Report

## Verified

- Frontend production build succeeds with Vite.
- Local frontend responds at `http://localhost:5173/`.
- Local API health responds at `http://localhost:8787/api/health`.
- Proposal governance flow creates a Proposed Curriculum Version, advances through configured stages, promotes to Official, and gates publication.
- Publication flow records queue, publish, channel, and consumer visibility states.
- Canonical leftbar is shared across academic, governance, quality, publication, consumer, oversight, intelligence, and administration modules.
- Repeated Dashboard labels preserve the standard leftbar while tracking the active dashboard area independently, preventing multiple Dashboard entries from highlighting at once.
- Consumer views are restricted in the prototype to Official + Published records.
- Curriculum Intelligence screens are labeled advisory and do not directly mutate governed records.

## Production boundary

The local API retains an in-memory fallback for visual demonstration. Before deployment to Canadian colleges, configure PostgreSQL, OIDC/OAuth2, object storage and workers, then complete the institutional security, privacy, accessibility, bilingual, residency, retention, observability, and records-management gates in the deployment runbook.

Persistence is implemented through migrations `000`–`007` and tenant-scoped repositories. When `DATABASE_URL` is configured, the API uses PostgreSQL for institution, academic structure, proposals, publications, consumer, evidence, audit, and job paths; the in-memory store remains only for visual demo mode.

The API has a guarded PostgreSQL connection boundary in `server/db.js`, tenant-scoped parameterized repositories, and a readiness endpoint that exposes whether production configuration is present. The demo remains in-memory when no database URL is present.

OIDC/JWT verification is implemented in `server/auth.js`. It validates issuer and audience through a remote JWKS and extracts tenant, role, and scope claims. Production identity-provider configuration and institutional claim policy remain deployment gates.

Tenant-scoped repository scaffolding is available in `server/repositories.js`. Queries require an institution identifier and use parameterized SQL. Proposal, publication, and audit-event list reads now use these repositories when `DATABASE_URL` is configured; local testing continues to use the in-memory demonstration store.

Reusable authorization policies are available in `server/authorization.js` for institution, role, and scope enforcement. Mutation routes apply these policies when `REQUIRE_AUTH=true`, using the configured institution scope and role requirements; local demo mode remains open for testing.

The API supports opt-in route protection through `REQUIRE_AUTH=true`; `/api/health` remains available for health checks and `/api/session` exposes the authenticated context for integration testing.

`/api/readiness` reports whether PostgreSQL is configured and reachable, OIDC and enforced authentication are configured, tenant scope is valid, evidence storage is configured, and CORS is secure. Local development reports `demo-ready` without blocking visual and workflow testing. The API also provides bounded JSON bodies, configurable CORS, correlation IDs, rate limiting, safe evidence metadata registration, and idempotent job submission.

API responses include `X-Correlation-ID`, structured JSON request logs are emitted, and a bounded configurable per-client request limit is applied. Production deployment still requires distributed rate limiting, centralized log retention, alerting, and correlation-aware observability.

The development API emits structured request logs with method, path, status, correlation ID, and duration while excluding bodies and sensitive headers.

Mutation requests use bounded JSON parsing with a configurable 16 KB–10 MB body limit and controlled errors for malformed or oversized payloads.

The standard leftbar now routes the repeated Dashboard entries to area-specific summaries for Quality / External, Publications, Consumer, and Oversight while preserving the global Dashboard.

## Current test commands

```text
npm run build
`npm run test:smoke`
GET http://localhost:5173/
GET http://localhost:8787/api/health
```

The prototype is ready for visual review, workflow walkthroughs, and architecture discussion. It is not production-ready until the required platform controls in `PHASE_13_HARDENING_CHECKLIST.md` are implemented and tested.
