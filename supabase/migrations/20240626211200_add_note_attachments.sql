create table note_attachments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references notes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  gcs_object_path text not null,
  created_at timestamptz not null default now()
);

create index idx_note_attachments_note on note_attachments(note_id);
create index idx_note_attachments_user on note_attachments(user_id);

alter table note_attachments enable row level security;

create policy "Users can select own attachments" on note_attachments
  for select using (auth.uid() = user_id);

create policy "Users can insert own attachments" on note_attachments
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own attachments" on note_attachments
  for delete using (auth.uid() = user_id);

-- 2 GB per-user storage quota enforced at insert time
create or replace function check_user_storage_quota()
returns trigger as $$
declare
  total_bytes bigint;
begin
  select coalesce(sum(size_bytes), 0) into total_bytes
  from note_attachments
  where user_id = NEW.user_id;

  if total_bytes + NEW.size_bytes > 2147483648 then
    raise exception 'Storage quota exceeded (2 GB limit)';
  end if;

  return NEW;
end;
$$ language plpgsql;

create trigger trg_check_storage_quota
before insert on note_attachments
for each row
execute function check_user_storage_quota();

-- Convenience view: total storage per user
create or replace view user_storage_usage as
  select user_id, coalesce(sum(size_bytes), 0) as total_bytes, count(*) as file_count
  from note_attachments
  group by user_id;
