create policy "Owners read their Research Records"
on public.researches for select
to authenticated
using (uploader_id = (select auth.uid()) and (select public.is_active_user()));

create policy "Owners delete their Research Records"
on public.researches for delete
to authenticated
using (uploader_id = (select auth.uid()) and (select public.is_active_user()));

create policy "Owners read Authors on their Research Records"
on public.authors for select
to authenticated
using (
  exists (
    select 1
    from public.research_authors ra
    join public.researches r on r.id = ra.research_id
    where ra.author_id = authors.id
      and r.uploader_id = (select auth.uid())
      and (select public.is_active_user())
  )
);

create policy "Owners read their Research Authors"
on public.research_authors for select
to authenticated
using (
  exists (
    select 1 from public.researches r
    where r.id = research_id
      and r.uploader_id = (select auth.uid())
      and (select public.is_active_user())
  )
);

create policy "Owners read their Research Categories"
on public.research_categories for select
to authenticated
using (
  exists (
    select 1 from public.researches r
    where r.id = research_id
      and r.uploader_id = (select auth.uid())
      and (select public.is_active_user())
  )
);

create policy "Owners read their Research Keywords"
on public.research_keywords for select
to authenticated
using (
  exists (
    select 1 from public.researches r
    where r.id = research_id
      and r.uploader_id = (select auth.uid())
      and (select public.is_active_user())
  )
);

grant select, delete on public.researches to authenticated;
grant select on public.research_authors, public.research_categories, public.research_keywords
to authenticated;

create function public.create_research_record(
  research_title text,
  research_abstract text,
  research_publish_date date,
  research_authors jsonb,
  category_ids uuid[] default '{}',
  keyword_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  created_id uuid;
  author_entry jsonb;
  author_id uuid;
begin
  if owner_id is null or not public.is_active_user() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if nullif(trim(research_title), '') is null then
    raise exception 'Title is required';
  end if;
  if jsonb_array_length(coalesce(research_authors, '[]'::jsonb)) = 0 then
    raise exception 'At least one Author is required';
  end if;

  insert into public.researches (
    title, abstract, publish_date, uploader_id
  ) values (
    trim(research_title),
    nullif(trim(research_abstract), ''),
    research_publish_date,
    owner_id
  ) returning id into created_id;

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
    values (created_id, author_id);
  end loop;

  insert into public.research_categories (research_id, category_id)
  select created_id, id from public.categories where id = any(category_ids);

  insert into public.research_keywords (research_id, keyword_id)
  select created_id, id from public.keywords where id = any(keyword_ids);

  return created_id;
end;
$$;

create function public.update_research_record(
  target_id uuid,
  research_title text,
  research_abstract text,
  research_publish_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_user() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.researches
  set
    title = trim(research_title),
    abstract = nullif(trim(research_abstract), ''),
    publish_date = research_publish_date,
    updated_at = now()
  where id = target_id
    and uploader_id = auth.uid()
    and status <> 'approved';

  if not found then
    raise exception 'Research Record not found or cannot be edited';
  end if;
end;
$$;

create function public.confirm_research_upload(target_id uuid, owner_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.researches
  set
    file_key = pending_file_key,
    file_name = pending_file_name,
    pending_file_key = null,
    pending_file_name = null,
    upload_complete = true,
    status = 'pending',
    rejection_reason = null,
    updated_at = now()
  where id = target_id
    and uploader_id = owner_id
    and pending_file_key is not null;

  if not found then
    if exists (
      select 1 from public.researches
      where id = target_id and uploader_id = owner_id and upload_complete
    ) then
      return;
    end if;
    raise exception 'No pending upload to confirm';
  end if;
end;
$$;

grant execute on function public.create_research_record(
  text, text, date, jsonb, uuid[], uuid[]
) to authenticated;
grant execute on function public.update_research_record(uuid, text, text, date)
to authenticated;
revoke all on function public.confirm_research_upload(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.confirm_research_upload(uuid, uuid) to service_role;

grant select, insert, update, delete on
  public.researches,
  public.authors,
  public.research_authors,
  public.research_categories,
  public.research_keywords
to service_role;
