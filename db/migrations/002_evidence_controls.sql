ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS malware_scan_status text NOT NULL DEFAULT 'Pending';
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'application/octet-stream';
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS byte_size bigint;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS retention_until date;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS encryption_key_ref text;
ALTER TABLE evidence_items DROP CONSTRAINT IF EXISTS evidence_items_malware_scan_status_check;
ALTER TABLE evidence_items ADD CONSTRAINT evidence_items_malware_scan_status_check CHECK (malware_scan_status IN ('Pending','Clean','Infected','Failed'));
INSERT INTO schema_migrations (version) VALUES ('002') ON CONFLICT (version) DO NOTHING;
