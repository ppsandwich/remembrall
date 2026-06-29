alter table embed_tokens add column color_names jsonb not null default '{}';

create or replace function generate_embed_token(p_section_id uuid, p_color_names jsonb default '{}')
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

create or replace function get_embed_data(p_token text)
returns json
language plpgsql
security definer
as $$
declare
  embed_record record;
  result json;
begin
  select et.section_id, et.owner_id, et.color_names, np.name as section_name
  into embed_record
  from embed_tokens et
  join note_pages np on np.id = et.section_id
  where et.token = p_token;

  if embed_record is null then
    return json_build_object('error', 'Invalid embed token');
  end if;

  select json_build_object(
    'section_name', embed_record.section_name,
    'color_names', embed_record.color_names,
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
