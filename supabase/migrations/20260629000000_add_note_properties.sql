ALTER TABLE notes ADD COLUMN IF NOT EXISTS properties jsonb NOT NULL DEFAULT '{}';
ALTER TABLE note_pages ADD COLUMN IF NOT EXISTS property_definitions jsonb NOT NULL DEFAULT '[]';
