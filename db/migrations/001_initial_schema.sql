-- Northern Star CCMS initial PostgreSQL schema
-- All tenant-owned records carry institution_id for server-side scope enforcement.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  jurisdiction text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Toronto',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE academic_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  parent_id uuid REFERENCES academic_units(id),
  code text NOT NULL,
  name text NOT NULL,
  unit_type text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  effective_from date NOT NULL,
  effective_to date,
  UNIQUE (institution_id, code, effective_from),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  oidc_subject text NOT NULL,
  email text NOT NULL,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  UNIQUE (institution_id, oidc_subject),
  UNIQUE (institution_id, email)
);

CREATE TABLE curriculum_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  item_type text NOT NULL CHECK (item_type IN ('Course','Program','Credential')),
  stable_code text NOT NULL,
  owning_unit_id uuid REFERENCES academic_units(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, item_type, stable_code)
);

CREATE TABLE curriculum_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  curriculum_item_id uuid NOT NULL REFERENCES curriculum_items(id),
  version_no integer NOT NULL,
  lifecycle_state text NOT NULL CHECK (lifecycle_state IN ('Draft','Proposed','Official','Archived')),
  title text NOT NULL,
  effective_term text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (curriculum_item_id, version_no)
);

CREATE TABLE proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  proposal_no text NOT NULL,
  proposal_type text NOT NULL,
  curriculum_item_id uuid REFERENCES curriculum_items(id),
  proposed_version_id uuid NOT NULL REFERENCES curriculum_versions(id),
  status text NOT NULL DEFAULT 'Submitted',
  current_stage text,
  created_by uuid NOT NULL REFERENCES users(id),
  submitted_at timestamptz,
  completed_at timestamptz,
  UNIQUE (institution_id, proposal_no)
);

CREATE TABLE committees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  code text NOT NULL,
  name text NOT NULL,
  scope text NOT NULL,
  quorum_percent numeric(5,2) NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'Active',
  UNIQUE (institution_id, code),
  CHECK (quorum_percent > 0 AND quorum_percent <= 100)
);

CREATE TABLE committee_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  committee_id uuid NOT NULL REFERENCES committees(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL,
  voting boolean NOT NULL DEFAULT true,
  effective_from date NOT NULL,
  effective_to date,
  UNIQUE (committee_id, user_id, effective_from),
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE TABLE governance_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  proposal_id uuid NOT NULL REFERENCES proposals(id),
  committee_id uuid NOT NULL REFERENCES committees(id),
  actor_user_id uuid NOT NULL REFERENCES users(id),
  stage text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('Approve','Return','Reject','Abstain')),
  rationale text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  curriculum_version_id uuid NOT NULL REFERENCES curriculum_versions(id),
  status text NOT NULL DEFAULT 'Queued',
  visibility text NOT NULL DEFAULT 'Private',
  channels jsonb NOT NULL DEFAULT '[]'::jsonb,
  scheduled_at timestamptz,
  queued_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (institution_id, curriculum_version_id)
);

CREATE TABLE publication_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  publication_id uuid NOT NULL REFERENCES publications(id),
  channel_code text NOT NULL,
  outcome text NOT NULL,
  external_reference text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (publication_id, channel_code)
);

CREATE TABLE evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  title text NOT NULL,
  evidence_type text NOT NULL,
  storage_key text NOT NULL,
  content_type text NOT NULL DEFAULT 'application/octet-stream',
  byte_size bigint,
  checksum text,
  malware_scan_status text NOT NULL DEFAULT 'Pending' CHECK (malware_scan_status IN ('Pending','Clean','Infected','Failed')),
  retention_until date,
  encryption_key_ref text,
  status text NOT NULL DEFAULT 'Available',
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  actor_user_id uuid REFERENCES users(id),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  previous_hash text,
  event_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
  id text PRIMARY KEY,
  institution_id uuid NOT NULL REFERENCES institutions(id),
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES users(id),
  idempotency_key text,
  status text NOT NULL DEFAULT 'Queued' CHECK (status IN ('Queued','Processing','Completed','Failed','Dead-lettered')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  last_error text,
  queued_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  UNIQUE (institution_id, job_type, idempotency_key)
);

CREATE INDEX idx_curriculum_versions_scope ON curriculum_versions (institution_id, lifecycle_state);
CREATE INDEX idx_proposals_scope_status ON proposals (institution_id, status, current_stage);
CREATE INDEX idx_governance_decisions_proposal ON governance_decisions (institution_id, proposal_id, created_at);
CREATE INDEX idx_publications_scope_status ON publications (institution_id, status);
CREATE INDEX idx_evidence_items_scope ON evidence_items (institution_id, evidence_type, status);
CREATE INDEX idx_audit_events_entity ON audit_events (institution_id, entity_type, entity_id, created_at);
CREATE INDEX idx_jobs_scope_status ON jobs (institution_id, status, queued_at);
INSERT INTO schema_migrations (version) VALUES ('001') ON CONFLICT (version) DO NOTHING;
