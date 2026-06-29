alter table user_preferences
  add column color_names jsonb not null default '{}',
  add column color_order jsonb not null default '[]';
