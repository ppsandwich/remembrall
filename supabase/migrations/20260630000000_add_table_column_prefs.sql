ALTER TABLE user_preferences
  ADD COLUMN table_column_widths jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN table_sort_state jsonb DEFAULT '{}'::jsonb;
