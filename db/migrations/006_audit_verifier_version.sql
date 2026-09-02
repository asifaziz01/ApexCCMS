ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS hash_version integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_audit_events_hash_version ON audit_events (institution_id, hash_version, created_at, id);
INSERT INTO schema_migrations (version) VALUES ('006') ON CONFLICT (version) DO NOTHING;
