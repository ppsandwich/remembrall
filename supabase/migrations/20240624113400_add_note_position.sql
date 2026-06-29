-- Add position column to notes table for drag-and-drop ordering
-- Run this SQL in your Supabase SQL editor

ALTER TABLE notes ADD COLUMN IF NOT EXISTS position FLOAT DEFAULT 0;

-- Set initial positions based on updated_at order
UPDATE notes
SET position = sub.row_num - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as row_num
  FROM notes
  WHERE deleted_at IS NULL
) sub
WHERE notes.id = sub.id;

-- Create index for faster ordering
CREATE INDEX IF NOT EXISTS idx_notes_position ON notes(user_id, position) WHERE deleted_at IS NULL;
