ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS privacy_classification text NOT NULL DEFAULT 'Internal';
ALTER TABLE evidence_items DROP CONSTRAINT IF EXISTS evidence_items_privacy_classification_check;
ALTER TABLE evidence_items ADD CONSTRAINT evidence_items_privacy_classification_check CHECK (privacy_classification IN ('Public','Internal','Confidential','Restricted'));
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS privacy_classification text NOT NULL DEFAULT 'Internal';
ALTER TABLE audit_events DROP CONSTRAINT IF EXISTS audit_events_privacy_classification_check;
ALTER TABLE audit_events ADD CONSTRAINT audit_events_privacy_classification_check CHECK (privacy_classification IN ('Public','Internal','Confidential','Restricted'));
CREATE INDEX IF NOT EXISTS idx_evidence_items_privacy ON evidence_items (institution_id, privacy_classification, status);
INSERT INTO schema_migrations (version) VALUES ('007') ON CONFLICT (version) DO NOTHING;
