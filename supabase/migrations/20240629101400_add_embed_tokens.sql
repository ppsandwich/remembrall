create table embed_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  section_id uuid not null references note_pages(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index idx_embed_tokens_token on embed_tokens(token);
create index idx_embed_tokens_section on embed_tokens(section_id);

alter table embed_tokens enable row level security;

create policy "Owners can manage own embed tokens" on embed_tokens
  for all using (auth.uid() = owner_id);

create table embed_notes (
  id uuid primary key default gen_random_uuid(),
  embed_token text not null references embed_tokens(token) on delete cascade,
  note_id uuid not null,
  title text not null default '',
  body text not null default '',
  color text not null default '',
  pinned boolean not null default false,
  position real not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(embed_token, note_id)
);

create index idx_embed_notes_token on embed_notes(embed_token);

alter table embed_notes enable row level security;

create trigger update_embed_notes_updated_at
before update on embed_notes
for each row
execute function update_updated_at_column();

create policy "Public read for embed notes" on embed_notes
  for select using (
    exists (
      select 1 from embed_tokens where token = embed_notes.embed_token
    )
  );

create policy "Authenticated insert embed notes" on embed_notes
  for insert with check (auth.uid() is not null);

create policy "Authenticated update embed notes" on embed_notes
  for update using (auth.uid() is not null);

create policy "Authenticated delete embed notes" on embed_notes
  for delete using (auth.uid() is not null);

alter publication supabase_realtime add table embed_notes;

create or replace function generate_embed_token(p_section_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  existing_token text;
  new_token text;
begin
  select token into existing_token
  from embed_tokens
  where section_id = p_section_id and owner_id = auth.uid()
  limit 1;

  if existing_token is not null then
    return existing_token;
  end if;

  insert into embed_tokens (section_id, owner_id)
  values (p_section_id, auth.uid())
  returning token into new_token;

  insert into embed_notes (embed_token, note_id, title, body, color, pinned, position)
  select
    new_token,
    n.id,
    coalesce(n.title, ''),
    '',
    coalesce(n.color, ''),
    n.pinned,
    n.position
  from notes n
  where n.page_id = p_section_id
    and n.user_id = auth.uid()
    and n.deleted_at is null;

  return new_token;
end;
$$;

create or replace function get_embed_data(p_token text)
returns json
language plpgsql
security definer
as $$
declare
  embed_record record;
  result json;
begin
  select et.section_id, et.owner_id, np.name as section_name
  into embed_record
  from embed_tokens et
  join note_pages np on np.id = et.section_id
  where et.token = p_token;

  if embed_record is null then
    return json_build_object('error', 'Invalid embed token');
  end if;

  select json_build_object(
    'section_name', embed_record.section_name,
    'notes', coalesce(
      json_agg(
        json_build_object(
          'id', en.note_id,
          'title', en.title,
          'body', en.body,
          'color', en.color,
          'pinned', en.pinned,
          'position', en.position
        ) order by en.pinned desc, en.position asc
      ) filter (where en.id is not null),
      '[]'::json
    )
  ) into result
  from embed_notes en
  where en.embed_token = p_token;

  return result;
end;
$$;

create or replace function sync_embed_note(
  p_token text,
  p_note_id uuid,
  p_title text,
  p_body text,
  p_color text,
  p_pinned boolean,
  p_position real
)
returns void
language plpgsql
security definer
as $$
begin
  insert into embed_notes (embed_token, note_id, title, body, color, pinned, position)
  values (p_token, p_note_id, p_title, p_body, p_color, p_pinned, p_position)
  on conflict (embed_token, note_id)
  do update set
    title = excluded.title,
    body = excluded.body,
    color = excluded.color,
    pinned = excluded.pinned,
    position = excluded.position,
    updated_at = now();
end;
$$;

create or replace function delete_embed_note(p_token text, p_note_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  delete from embed_notes
  where embed_token = p_token and note_id = p_note_id;
end;
$$;

create or replace function get_embed_tokens_for_page(p_page_id uuid)
returns setof text
language sql
security definer
stable
as $$
  select token from embed_tokens
  where section_id = p_page_id and owner_id = auth.uid();
$$;
