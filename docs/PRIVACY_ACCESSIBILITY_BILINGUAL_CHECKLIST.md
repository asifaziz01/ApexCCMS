# Canadian College Readiness Checklist

This checklist records decisions that must be completed with each adopting college before production approval.

- Confirm the applicable provincial privacy and freedom-of-information requirements, data owner, purpose limitation, retention schedule, and records disposition.
- Confirm Canadian data residency requirements for PostgreSQL, object storage, backups, logs, and identity-provider telemetry.
- Record the approved residency decision in `DATA_RESIDENCY_REGION`; production readiness remains false until the deployment supplies this value.
- Complete a privacy impact assessment and threat model; document breach response, access reviews, and least-privilege roles.
- Validate WCAG 2.2 AA keyboard navigation, focus order, visible focus, contrast, error messaging, tables, dialogs, and screen-reader names.
- The current shell includes a keyboard skip link and visible `:focus-visible` treatment; complete page-by-page assistive-technology and contrast validation before sign-off.
- The shell now provides an accessible English/French toggle, persists the preference locally, updates the document language, and translates canonical navigation labels. Complete translation coverage for every page, validation message, date/number format, and authenticated user preference before institutional sign-off.
- Obtain institutional sign-off for public publication channels, regulatory evidence retention, external reviewer access, and accessibility conformance.
