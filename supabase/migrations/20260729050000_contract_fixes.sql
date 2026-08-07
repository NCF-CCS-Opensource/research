drop function public.update_research_record(uuid, text, text, date);

create function public.update_research_record(
  target_id uuid,
  research_title text,
  research_abstract text,
  research_publish_date date,
  research_authors jsonb,
  category_ids uuid[] default '{}',
  keyword_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  author_entry jsonb;
  author_id uuid;
begin
  if not public.is_active_user() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if nullif(trim(research_title), '') is null then
    raise exception 'Title is required';
  end if;
  if jsonb_array_length(coalesce(research_authors, '[]'::jsonb)) = 0 then
    raise exception 'At least one Author is required';
  end if;

  update public.researches
  set
    title = trim(research_title),
    abstract = nullif(trim(research_abstract), ''),
    publish_date = research_publish_date,
    updated_at = now()
  where id = target_id
    and uploader_id = public.current_user_id()
    and status <> 'approved';

  if not found then
    raise exception 'Research Record not found or cannot be edited';
  end if;

  delete from public.research_authors where research_id = target_id;
  for author_entry in select value from jsonb_array_elements(research_authors)
  loop
    if nullif(trim(author_entry ->> 'name'), '') is null then
      raise exception 'Author name is required';
    end if;
    insert into public.authors (name, email)
    values (
      trim(author_entry ->> 'name'),
      nullif(lower(trim(author_entry ->> 'email')), '')
    )
    on conflict (name, email) do update set name = excluded.name
    returning id into author_id;
    insert into public.research_authors (research_id, author_id)
    values (target_id, author_id);
  end loop;

  delete from public.research_categories where research_id = target_id;
  insert into public.research_categories (research_id, category_id)
  select target_id, id from public.categories where id = any(category_ids);

  delete from public.research_keywords where research_id = target_id;
  insert into public.research_keywords (research_id, keyword_id)
  select target_id, id from public.keywords where id = any(keyword_ids);
end;
$$;

grant execute on function public.update_research_record(
  uuid, text, text, date, jsonb, uuid[], uuid[]
) to authenticated;
