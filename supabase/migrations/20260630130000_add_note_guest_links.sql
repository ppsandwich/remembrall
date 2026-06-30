-- Add note_id column to embed_tokens for individual note sharing
-- Make section_id nullable so a token can be scoped to a single note instead

alter table embed_tokens alter column section_id drop not null;
alter table embed_tokens add column note_id uuid references notes(id) on delete cascade;

create index idx_embed_tokens_note on embed_tokens(note_id);

alter table embed_tokens add constraint embed_tokens_scope_check
  check (
    (section_id is not null and note_id is null) or
    (section_id is null and note_id is not null)
  );

-- Override generate_embed_token to accept optional p_note_id
-- When p_note_id is set, creates a single-note guest link token
create or replace function generate_embed_token(
  p_section_id uuid default null,
  p_note_id uuid default null,
  p_color_names jsonb default '{}'
)
returns text
language plpgsql
security definer
as $$
declare
  existing_token text;
  new_token text;
  resolved_section_id uuid;
  note_record record;
begin
  if p_note_id is not null then
    -- Single-note guest link mode
    select id, page_id, user_id into note_record
    from notes where id = p_note_id;

    if note_record is null then
      raise exception 'Note not found';
    end if;

    if note_record.user_id != auth.uid() then
      raise exception 'Not your note';
    end if;

    resolved_section_id := note_record.page_id;

    select token into existing_token
    from embed_tokens
    where note_id = p_note_id and owner_id = auth.uid()
    limit 1;

    if existing_token is not null then
      return existing_token;
    end if;

    insert into embed_tokens (section_id, note_id, owner_id, color_names)
    values (resolved_section_id, p_note_id, auth.uid(), p_color_names)
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
    where n.id = p_note_id
      and n.user_id = auth.uid()
      and n.deleted_at is null;

    return new_token;
  end if;

  -- Page-level embed mode (existing behavior)
  if p_section_id is null then
    raise exception 'Either p_section_id or p_note_id must be provided';
  end if;

  select token into existing_token
  from embed_tokens
  where section_id = p_section_id and note_id is null and owner_id = auth.uid()
  limit 1;

  if existing_token is not null then
    update embed_tokens set color_names = p_color_names where token = existing_token;
    return existing_token;
  end if;

  insert into embed_tokens (section_id, owner_id, color_names)
  values (p_section_id, auth.uid(), p_color_names)
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

-- Override get_embed_data to handle note-level tokens
create or replace function get_embed_data(p_token text)
returns json
language plpgsql
security definer
as $$
declare
  embed_record record;
  result json;
begin
  select et.section_id, et.note_id, et.owner_id, et.color_names,
         np.name as section_name
  into embed_record
  from embed_tokens et
  left join note_pages np on np.id = et.section_id
  where et.token = p_token;

  if embed_record is null then
    return json_build_object('error', 'Invalid embed token');
  end if;

  select json_build_object(
    'section_name', coalesce(embed_record.section_name, ''),
    'color_names', embed_record.color_names,
    'single_note', embed_record.note_id is not null,
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

-- Get all embed tokens for a specific note owned by the current user
create or replace function get_embed_tokens_for_note(p_note_id uuid)
returns setof text
language sql
security definer
stable
as $$
  select token from embed_tokens
  where note_id = p_note_id and owner_id = auth.uid();
$$;
