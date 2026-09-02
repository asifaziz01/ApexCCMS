# Northern Star CCMS

Canadian college curriculum management and governance platform foundation.

## Local review

```text
npm ci
npm run dev       # http://localhost:5173/
npm run api       # http://localhost:8787
```

The local API uses an in-memory demo store when `DATABASE_URL` is unset. Use the application at [http://localhost:5173/](http://localhost:5173/) and the API health endpoint at [http://localhost:8787/api/health](http://localhost:8787/api/health).

## PostgreSQL

Copy `.env.example`, provide a real connection string, then run:

```text
npm run db:migrate
npm run db:seed
npm run test:database
npm run verify:audit
```

When PostgreSQL is configured, the API uses tenant-scoped repositories for institution, academic structure, proposals, publications, consumer, evidence, audit, and jobs. The database CI job starts the API against PostgreSQL and exercises the SQL-backed workflow.

## Verification

```text
npm run test:security
npm run test:production-config
npm run test:auth-jwt
npm run test:authorization
npm run test:ui-contract
npm run test:deployment-contract
npm run test:backup-contract
npm run test:server
npm run test:platform
npm run test:production-errors
npm run test:smoke
npm run build
```

## Production gate

Run `npm run check:production`, then confirm `/api/readiness` reports `production-ready`. Production requires PostgreSQL connectivity, OIDC/JWKS configuration, enforced authentication, a UUID institution scope, secure CORS, evidence storage, and `DATA_RESIDENCY_REGION`. Use `docker-compose.production.yml` only with institution-approved secrets and services.

See [docs/DEPLOYMENT_RUNBOOK.md](docs/DEPLOYMENT_RUNBOOK.md), [docs/PHASE_13_HARDENING_CHECKLIST.md](docs/PHASE_13_HARDENING_CHECKLIST.md), and [docs/PRIVACY_ACCESSIBILITY_BILINGUAL_CHECKLIST.md](docs/PRIVACY_ACCESSIBILITY_BILINGUAL_CHECKLIST.md) for operational and policy gates.
