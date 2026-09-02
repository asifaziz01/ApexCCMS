# Phase 1 — Platform Foundation Design

Status: Designed for implementation review. The current preview uses local representative data; persistence and server-side authorization are the next backend milestone.

## Scope

- Institution, Campus, Faculty/School, Academic Unit
- Effective-dated Academic Unit identity and names
- Users, configurable roles, permissions, scoped assignments
- Reference data
- Append-only audit events

## Relational model

```text
institutions
  id, ccms_id, name, legal_name, status, default_locale, created_at, updated_at
campuses
  id, institution_id, ccms_id, name, status, created_at, updated_at
faculties
  id, institution_id, ccms_id, name, status, created_at, updated_at
academic_units
  id, institution_id, faculty_id, ccms_id, stable_slug, status, created_at, updated_at
academic_unit_versions
  id, academic_unit_id, name, description, effective_from, effective_to, status
academic_unit_relationships
  id, predecessor_unit_id, successor_unit_id, relationship_type, effective_at, reason
users
  id, institution_id, subject, display_name, email, status, last_login_at
roles
  id, institution_id, name, description, status, is_template
permissions
  id, key, description, resource, action
role_permissions
  role_id, permission_id
role_assignments
  id, user_id, role_id, scope_type, scope_id, effective_from, effective_to, status
reference_data
  id, institution_id, category, code, label, metadata, effective_from, effective_to, status
audit_events
  id, institution_id, actor_user_id, actor_role_id, scope_type, scope_id,
  action, object_type, object_id, previous_value, new_value, reason,
  source_system, occurred_at, integrity_hash
```

Every tenant-owned table carries `institution_id`. Stable CCMS IDs are generated independently from external identifiers. Academic Unit names are versions, not overwrites.

## API contracts

```text
GET    /api/institutions/:institutionId/academic-structure
POST   /api/institutions/:institutionId/campuses
POST   /api/institutions/:institutionId/faculties
POST   /api/institutions/:institutionId/academic-units
PATCH  /api/academic-units/:id
POST   /api/academic-units/:id/versions
GET    /api/academic-units/:id/history

GET    /api/institutions/:institutionId/users
GET    /api/institutions/:institutionId/roles
GET    /api/permissions
POST   /api/role-assignments
PATCH  /api/role-assignments/:id

GET    /api/reference-data/:category
GET    /api/audit-events
```

Commands validate institution scope, effective-date overlap, stable identity, and actor permissions. API responses should include a correlation ID and audit reference for mutations.

## Authorization rules

Authorization is evaluated as `User + Role + Permission + Scope + Resource Context`.

- Institution administrators may manage institution configuration within their institution.
- Curriculum administrators may manage Academic Units within assigned scope.
- Read-only users may query authorized records but cannot mutate them.
- A user assigned the same role at different Academic Unit scopes receives different authorization results.
- Server-side authorization is authoritative; hidden navigation is not a security boundary.

## Acceptance criteria

1. A new Academic Unit receives a stable CCMS ID.
2. Renaming an Academic Unit creates a new effective-dated version and preserves prior history.
3. Overlapping active name versions are rejected.
4. Predecessor/successor relationships preserve historical context.
5. A scoped user cannot read or mutate another Academic Unit outside scope.
6. Role permissions are configurable and do not depend on role-name checks.
7. Every mutation creates an audit event with actor, scope, old/new values, timestamp, and reason.
8. Reference data is tenant-scoped and effective-dated where applicable.
9. Tenant identifiers are enforced on every read and write.
10. Login and server-side authorization tests pass before Phase 2 begins.

## Implementation boundary

Phase 1 must not implement Programs, Courses, curriculum versions, proposal workflows, or Banner synchronization. Those begin in later phases.

Administration foundation now includes versioned workflow definitions, controlled reference sets, and auditable institutional settings with explicit governance/security controls.
