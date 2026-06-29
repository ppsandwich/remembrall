-- Add color column to notes table
-- Run this SQL in your Supabase SQL editor

ALTER TABLE notes ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '';

-- Create index for clustering by color
CREATE INDEX IF NOT EXISTS idx_notes_color ON notes(user_id, color) WHERE deleted_at IS NULL AND color != '';
