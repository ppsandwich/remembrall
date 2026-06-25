create table section_shares (
  id uuid primary key default gen_random_uuid(),
  share_token uuid not null default gen_random_uuid() unique,
  section_id uuid not null references note_pages(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  shared_with_email text not null,
  shared_with_user_id uuid references auth.users(id) on delete cascade,
  permission text not null default 'viewer' check (permission in ('viewer', 'editor')),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now()
);

create index idx_section_shares_section on section_shares(section_id);
create index idx_section_shares_user on section_shares(shared_with_user_id) where status = 'accepted';
create index idx_section_shares_token on section_shares(share_token) where status = 'pending';

alter table section_shares enable row level security;

create or replace function is_section_owner(section uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from note_pages where id = section and user_id = auth.uid()
  );
$$;

create or replace function is_section_editor(section uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from section_shares
    where section_id = section
      and shared_with_user_id = auth.uid()
      and status = 'accepted'
      and permission = 'editor'
  );
$$;

create or replace function has_section_access(section uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from section_shares
    where section_id = section
      and shared_with_user_id = auth.uid()
      and status = 'accepted'
  );
$$;

create policy "Owners can manage shares on own sections" on section_shares
  for all using (is_section_owner(section_id));

create policy "Collaborators can view own shares" on section_shares
  for select using (shared_with_user_id = auth.uid() and status = 'accepted');

create policy "Collaborators can view shared pages" on note_pages
  for select using (has_section_access(id));

create policy "Collaborators can view notes in shared sections" on notes
  for select using (page_id is not null and has_section_access(page_id));

create policy "Editors can insert notes in shared sections" on notes
  for insert with check (page_id is not null and is_section_editor(page_id));

create policy "Editors can update notes in shared sections" on notes
  for update using (page_id is not null and is_section_editor(page_id));

create policy "Editors can delete notes in shared sections" on notes
  for delete using (page_id is not null and is_section_editor(page_id));

create or replace function accept_share_by_token(token uuid)
returns json
language plpgsql
security definer
as $$
declare
  share_record record;
begin
  select * into share_record
  from section_shares
  where share_token = token and status = 'pending';

  if share_record is null then
    return json_build_object('error', 'Invalid or expired link');
  end if;

  if share_record.owner_id = auth.uid() then
    return json_build_object('error', 'Cannot accept your own share');
  end if;

  update section_shares
  set shared_with_user_id = auth.uid(), status = 'accepted'
  where id = share_record.id;

  return json_build_object(
    'success', true,
    'section_id', share_record.section_id,
    'permission', share_record.permission
  );
end;
$$;
