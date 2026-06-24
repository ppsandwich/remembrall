create table note_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Default',
  position float not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_note_pages_user on note_pages(user_id, position);

create trigger update_note_pages_updated_at
before update on note_pages
for each row
execute function update_updated_at_column();

alter table note_pages enable row level security;

create policy "Users can select own pages" on note_pages
  for select using (auth.uid() = user_id);

create policy "Users can insert own pages" on note_pages
  for insert with check (auth.uid() = user_id);

create policy "Users can update own pages" on note_pages
  for update using (auth.uid() = user_id);

create policy "Users can delete own pages" on note_pages
  for delete using (auth.uid() = user_id);

alter table notes add column page_id uuid references note_pages(id) on delete set null;
create index idx_notes_page on notes(user_id, page_id) where deleted_at is null;

insert into note_pages (id, user_id, name, position)
select gen_random_uuid(), id, 'Default', 0
from auth.users
on conflict do nothing;

update notes
set page_id = (
  select np.id from note_pages np
  where np.user_id = notes.user_id
  limit 1
)
where page_id is null;
