CREATE OR REPLACE FUNCTION prevent_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Immutable history record cannot be changed or deleted';
END;
$$;

DROP TRIGGER IF EXISTS audit_events_immutable ON audit_events;
CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION prevent_history_mutation();
DROP TRIGGER IF EXISTS publication_results_immutable ON publication_results;
CREATE TRIGGER publication_results_immutable BEFORE UPDATE OR DELETE ON publication_results FOR EACH ROW EXECUTE FUNCTION prevent_history_mutation();

INSERT INTO schema_migrations (version) VALUES ('004') ON CONFLICT (version) DO NOTHING;
