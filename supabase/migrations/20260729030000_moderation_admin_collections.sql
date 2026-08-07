create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id text not null references public.profiles (id),
  research_id uuid references public.researches (id) on delete set null,
  action varchar(50) not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create table public.collections (
  user_id text not null references public.profiles (id) on delete cascade,
  research_id uuid not null references public.researches (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, research_id)
);

create or replace view public.public_research
with (security_invoker = true)
as
select
  r.id,
  r.title,
  r.abstract,
  r.publish_date,
  r.status,
  r.uploader_id,
  r.upload_complete,
  r.view_count,
  r.download_count,
  r.citation_count,
  r.created_at,
  r.updated_at,
  coalesce(
    (
      select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'email', a.email) order by a.name)
      from public.research_authors ra
      join public.authors a on a.id = ra.author_id
      where ra.research_id = r.id
    ),
    '[]'::jsonb
  ) as authors,
  coalesce(
    (
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name)
      from public.research_categories rc
      join public.categories c on c.id = rc.category_id
      where rc.research_id = r.id
    ),
    '[]'::jsonb
  ) as categories,
  coalesce(
    (
      select jsonb_agg(jsonb_build_object('id', k.id, 'name', k.name) order by k.name)
      from public.research_keywords rk
      join public.keywords k on k.id = rk.keyword_id
      where rk.research_id = r.id
    ),
    '[]'::jsonb
  ) as keywords,
  r.rejection_reason
from public.researches r;

alter table public.audit_logs enable row level security;
alter table public.collections enable row level security;

create policy "Admins read all Research Records"
on public.researches for select
to authenticated
using ((select public.is_admin()));

create policy "Admins read Authors"
on public.authors for select
to authenticated
using ((select public.is_admin()));

create policy "Admins read Research Authors"
on public.research_authors for select
to authenticated
using ((select public.is_admin()));

create policy "Admins read Research Categories"
on public.research_categories for select
to authenticated
using ((select public.is_admin()));

create policy "Admins read Research Keywords"
on public.research_keywords for select
to authenticated
using ((select public.is_admin()));

create policy "Admins read Audit Logs"
on public.audit_logs for select
to authenticated
using ((select public.is_admin()));

create policy "Users read their Collection"
on public.collections for select
to authenticated
using (user_id = (select public.current_user_id()) and (select public.is_active_user()));

create policy "Users add eligible Research Records to their Collection"
on public.collections for insert
to authenticated
with check (
  user_id = (select public.current_user_id())
  and (select public.is_active_user())
  and exists (
    select 1 from public.researches r
    where r.id = research_id
      and r.status = 'approved'
      and r.upload_complete
  )
);

create policy "Users remove from their Collection"
on public.collections for delete
to authenticated
using (user_id = (select public.current_user_id()) and (select public.is_active_user()));

create policy "Admins create Categories"
on public.categories for insert to authenticated
with check ((select public.is_admin()));
create policy "Admins update Categories"
on public.categories for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete Categories"
on public.categories for delete to authenticated
using ((select public.is_admin()));

create policy "Admins create Keywords"
on public.keywords for insert to authenticated
with check ((select public.is_admin()));
create policy "Admins update Keywords"
on public.keywords for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete Keywords"
on public.keywords for delete to authenticated
using ((select public.is_admin()));

create policy "Admins create Institutions"
on public.institutions for insert to authenticated
with check ((select public.is_admin()));
create policy "Admins update Institutions"
on public.institutions for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete Institutions"
on public.institutions for delete to authenticated
using ((select public.is_admin()));

create policy "Admins create Programs"
on public.programs for insert to authenticated
with check ((select public.is_admin()));
create policy "Admins update Programs"
on public.programs for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete Programs"
on public.programs for delete to authenticated
using ((select public.is_admin()));

grant select on public.audit_logs to authenticated;
grant select, insert, delete on public.collections to authenticated;
grant insert, update, delete on
  public.categories, public.keywords, public.institutions, public.programs
to authenticated;

create function public.moderate_research(
  target_id uuid,
  decision public.research_status,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if decision not in ('approved', 'rejected') then
    raise exception 'Invalid moderation decision';
  end if;
  if decision = 'rejected' and nullif(trim(reason), '') is null then
    raise exception 'Rejection reason is required';
  end if;

  update public.researches
  set
    status = decision,
    rejection_reason = case when decision = 'rejected' then trim(reason) else null end,
    updated_at = now()
  where id = target_id
    and status = 'pending'
    and (decision <> 'approved' or (upload_complete and file_key is not null));

  if not found then
    raise exception 'Research Record is not eligible for moderation';
  end if;

  insert into public.audit_logs (admin_id, research_id, action, meta)
  values (
    public.current_user_id(),
    target_id,
    case when decision = 'approved' then 'approve' else 'reject' end,
    case when decision = 'rejected' then jsonb_build_object('reason', trim(reason)) end
  );
end;
$$;

create function public.resubmit_research(target_id uuid)
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
  set status = 'pending', rejection_reason = null, updated_at = now()
  where id = target_id and uploader_id = public.current_user_id() and status = 'rejected';

  if not found then
    raise exception 'Rejected Research Record not found';
  end if;
end;
$$;

grant execute on function public.moderate_research(uuid, public.research_status, text)
to authenticated;
grant execute on function public.resubmit_research(uuid) to authenticated;

grant select, insert on public.audit_logs to service_role;
grant select, insert, update, delete on public.collections to service_role;
grant select, update on public.profiles to service_role;
