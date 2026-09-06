ALTER TABLE curriculum_items DROP CONSTRAINT IF EXISTS curriculum_items_item_type_check;
ALTER TABLE curriculum_items ADD CONSTRAINT curriculum_items_item_type_check CHECK (item_type IN ('Course','Program','Credential','Requirement'));
