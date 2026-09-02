# Northern Star CCMS Deployment Runbook

## Local verification

1. Copy `.env.example` to the deployment environment and set a real `DATABASE_URL`, `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `CORS_ORIGIN`, `VITE_API_URL`, `EVIDENCE_STORAGE_PROVIDER`, `DATA_RESIDENCY_REGION`, and `REQUIRE_AUTH=true`. Tune `RATE_LIMIT_PER_MINUTE` and `MAX_BODY_BYTES` for the institution’s traffic and upload policy; the API applies bounded defaults and caps unsafe values.
   For container deployment, use `docker-compose.production.yml`; its required-variable checks prevent the demo `INSTITUTION_ID`, authentication-disabled mode, and placeholder secrets from being used accidentally. Set `VITE_API_URL` to the public HTTPS origin so the browser uses the same-origin `/api` proxy and Nginx CSP remains valid.
   The approved OIDC host integration must provide either `window.__CCMS_GET_ACCESS_TOKEN__()` or a short-lived `window.__CCMS_ACCESS_TOKEN__` value before rendering the shell. The frontend attaches that bearer token to API requests; the API remains authoritative for issuer, audience, tenant, role, and scope validation.
2. Apply all files in `db/migrations/` with the migration runner; this includes immutability triggers for audit and publication history.
3. Run `npm run db:migrate`, then `npm run db:seed`; set `INSTITUTION_ID` to the seeded institution UUID.
4. Run `npm ci`, `npm run db:migrate`, `npm run db:seed`, `npm run test:database`, `npm run test:security`, `npm run test:authorization`, `npm run test:ui-contract`, `npm run test:production-errors`, `npm run build`, `npm run test:smoke`, `npm run test:platform`, and `npm run test:server`.
5. Run `npm run check:production` in the deployment environment; it must report `productionReady: true` before release, then call `/api/readiness` and confirm both database configuration and live connectivity are healthy. Preserve the frontend security headers from `vite.config.js` at the approved TLS reverse proxy/CDN as well.
6. Start the API with `npm run api` and serve `dist/` behind the institution's approved TLS reverse proxy.
7. Run one or more separately supervised `npm run worker` processes against the same database. Configure restart policy, minimum worker count, queue alerts, and dead-letter review ownership. `DEV_ACTOR_SUBJECT` is only for non-authenticated database smoke testing and must be unset in production.
   Set `JOB_STALE_AFTER_SECONDS` above the longest expected handler duration; the worker requeues abandoned processing leases before claiming new work.

The worker includes the `evidence.retention` handler. Schedule that job through the institution's approved scheduler and review unknown or dead-lettered job types; do not silently discard failed work.
Evidence and audit records use explicit privacy classifications (`Public`, `Internal`, `Confidential`, or `Restricted`). Confirm the college's classification policy and retention schedule before production data is loaded.

For a containerized deployment, build `Dockerfile.api` and `Dockerfile.web`; `docker compose up --build` provides the API, Nginx frontend, and PostgreSQL development topology. Pass `--build-arg VITE_API_URL=<approved-api-origin>` for the web image. Replace the compose development values, enable authentication, and use managed services before production.

The repository CI workflow at `.github/workflows/ci.yml` repeats dependency, production-configuration, JWT authentication, authorization, UI-contract, build, API smoke, platform, server, deployment, backup, and database-contract checks on pushes and pull requests. Its database job also starts the API against PostgreSQL and runs the SQL-backed proposal/publication/consumer workflow plus audit-chain verification.

## Production gates

The readiness endpoint must report `production-ready`, including live PostgreSQL connectivity, a valid UUID tenant scope, secure CORS, a configured residency decision, and all required platform settings. A green build alone is not sufficient: verify OIDC issuer and audience validation, tenant scope, object-storage permissions, malware scanning, worker execution, structured logs, alerting, and privacy/records approvals.

## Database backup and recovery

Use the institution's managed PostgreSQL backup policy with encrypted backups, point-in-time recovery, and a documented retention period. Restore a backup into an isolated environment at least quarterly, apply migrations, run the smoke suites, and record the recovery time and recovery point results.

For operator-assisted backups, use `scripts/backup-database.ps1 -OutputFile <explicit-path>`. For recovery, validate an isolated target first and use `scripts/restore-database.ps1 -BackupFile <explicit-file> -TargetDatabase <explicit-target> -ConfirmRestore`; never restore over an operational database without the institution's change approval.

## Operational response

Preserve the `X-Correlation-ID` from an incident report. Review API logs, audit events, job status and dead-letter records, then follow the institution's incident, privacy breach, and records-management procedures. Never place evidence contents or tokens in logs.
