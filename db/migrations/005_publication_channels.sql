ALTER TABLE publications ADD COLUMN IF NOT EXISTS channels jsonb NOT NULL DEFAULT '[]'::jsonb;
INSERT INTO schema_migrations (version) VALUES ('005') ON CONFLICT (version) DO NOTHING;
