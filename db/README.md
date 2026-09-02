# Northern Star CCMS database bootstrap

The initial schema is in `db/migrations/001_initial_schema.sql` and subsequent changes are tracked in `db/migrations/`. For local development:

```text
docker compose up -d postgres
```

The mounted migrations run automatically on the first initialization of the PostgreSQL volume. The local connection string is:

```text
postgresql://ccms_app:change-me-local-only@localhost:5432/northern_star_ccms
```

With PostgreSQL available, initialize the schema and tenant bootstrap with:

```text
npm run db:migrate
npm run db:seed
```

Set `INSTITUTION_ID` to the UUID printed by the seed command before enabling `REQUIRE_AUTH=true`.

The API connects to PostgreSQL when `DATABASE_URL` is configured. Without it, the local in-memory fallback remains available for visual and workflow review. Before deployment, add migration tracking, tenant seed data, production secret management, and the institution's approved connection/backup policy.
