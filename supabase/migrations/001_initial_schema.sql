create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  encrypted_body jsonb not null,
  body_preview_encrypted jsonb null,
  pinned boolean not null default false,
  archived boolean not null default false,
  deleted_at timestamptz null,
  duplicated_from uuid null references notes(id) on delete set null,
  source text not null default 'web',
  encryption_version integer not null default 1,
  key_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'light',
  default_view text not null default 'recent',
  keymap text not null default 'default',
  auto_lock_minutes integer not null default 30,
  desktop_global_shortcut text null,
  desktop_auto_detect_clipboard boolean not null default false,
  desktop_hide_on_blur boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_encryption_keys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  key_version integer not null default 1,
  kdf text not null,
  salt text not null,
  verifier text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_updated_idx on notes(user_id, updated_at desc);
create index notes_user_created_idx on notes(user_id, created_at desc);
create index notes_deleted_idx on notes(user_id, deleted_at);
create index notes_source_idx on notes(user_id, source);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_notes_updated_at
before update on notes
for each row
execute function update_updated_at_column();

create trigger update_user_preferences_updated_at
before update on user_preferences
for each row
execute function update_updated_at_column();

create trigger update_user_encryption_keys_updated_at
before update on user_encryption_keys
for each row
execute function update_updated_at_column();

alter table notes enable row level security;
alter table user_preferences enable row level security;
alter table user_encryption_keys enable row level security;

create policy "Users can select own notes" on notes
  for select using (auth.uid() = user_id);

create policy "Users can insert own notes" on notes
  for insert with check (auth.uid() = user_id);

create policy "Users can update own notes" on notes
  for update using (auth.uid() = user_id);

create policy "Users can delete own notes" on notes
  for delete using (auth.uid() = user_id);

create policy "Users can select own preferences" on user_preferences
  for select using (auth.uid() = user_id);

create policy "Users can insert own preferences" on user_preferences
  for insert with check (auth.uid() = user_id);

create policy "Users can update own preferences" on user_preferences
  for update using (auth.uid() = user_id);

create policy "Users can select own encryption key" on user_encryption_keys
  for select using (auth.uid() = user_id);

create policy "Users can insert own encryption key" on user_encryption_keys
  for insert with check (auth.uid() = user_id);

create policy "Users can update own encryption key" on user_encryption_keys
  for update using (auth.uid() = user_id);
