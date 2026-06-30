create table note_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  encrypted_body jsonb not null,
  body_preview_encrypted jsonb null,
  color text not null default '',
  icon text not null default 'file-text',
  category text not null default 'general',
  properties jsonb not null default '[]',
  built_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table note_templates enable row level security;

create policy "Users can manage own templates"
  on note_templates for all
  using (auth.uid() = user_id);

create trigger update_note_templates_updated_at
  before update on note_templates
  for each row execute function update_updated_at_column();

create index idx_note_templates_user on note_templates(user_id);
