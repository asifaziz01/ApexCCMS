ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS previous_hash text;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS event_hash text;
UPDATE audit_events SET event_hash = encode(digest(id::text, 'sha256'), 'hex') WHERE event_hash IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_events_event_hash ON audit_events (event_hash);
INSERT INTO schema_migrations (version) VALUES ('003') ON CONFLICT (version) DO NOTHING;
