create type public.research_status as enum ('pending', 'approved', 'rejected');

create table public.researches (
  id uuid primary key default gen_random_uuid(),
  title varchar(500) not null,
  abstract text,
  publish_date date,
  status public.research_status not null default 'pending',
  uploader_id uuid references auth.users (id),
  file_key varchar(500),
  file_name varchar(255),
  pending_file_key varchar(500),
  pending_file_name varchar(255),
  upload_complete boolean not null default false,
  rejection_reason text,
  view_count integer not null default 0,
  download_count integer not null default 0,
  citation_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.authors (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  email varchar(255),
  unique (name, email)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null unique
);

create table public.keywords (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null unique
);

create table public.research_authors (
  research_id uuid not null references public.researches (id) on delete cascade,
  author_id uuid not null references public.authors (id) on delete cascade,
  primary key (research_id, author_id)
);

create table public.research_categories (
  research_id uuid not null references public.researches (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (research_id, category_id)
);

create table public.research_keywords (
  research_id uuid not null references public.researches (id) on delete cascade,
  keyword_id uuid not null references public.keywords (id) on delete cascade,
  primary key (research_id, keyword_id)
);

alter table public.researches enable row level security;
alter table public.authors enable row level security;
alter table public.categories enable row level security;
alter table public.keywords enable row level security;
alter table public.research_authors enable row level security;
alter table public.research_categories enable row level security;
alter table public.research_keywords enable row level security;

create policy "Guests read approved Research Records"
on public.researches for select
to anon, authenticated
using (status = 'approved');

create policy "Guests read Authors of approved Research Records"
on public.authors for select
to anon, authenticated
using (
  exists (
    select 1
    from public.research_authors ra
    join public.researches r on r.id = ra.research_id
    where ra.author_id = authors.id and r.status = 'approved'
  )
);

create policy "Guests read Categories"
on public.categories for select
to anon, authenticated
using (true);

create policy "Guests read Keywords"
on public.keywords for select
to anon, authenticated
using (true);

create policy "Guests read approved Research Authors"
on public.research_authors for select
to anon, authenticated
using (
  exists (
    select 1 from public.researches r
    where r.id = research_id and r.status = 'approved'
  )
);

create policy "Guests read approved Research Categories"
on public.research_categories for select
to anon, authenticated
using (
  exists (
    select 1 from public.researches r
    where r.id = research_id and r.status = 'approved'
  )
);

create policy "Guests read approved Research Keywords"
on public.research_keywords for select
to anon, authenticated
using (
  exists (
    select 1 from public.researches r
    where r.id = research_id and r.status = 'approved'
  )
);

grant usage on schema public to anon, authenticated;
grant select on public.researches, public.authors, public.categories, public.keywords,
  public.research_authors, public.research_categories, public.research_keywords
to anon, authenticated;

create view public.public_research
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
  ) as keywords
from public.researches r;

create view public.public_authors
with (security_invoker = true)
as
select
  a.id,
  a.name,
  a.email,
  count(ra.research_id)::integer as paper_count
from public.authors a
join public.research_authors ra on ra.author_id = a.id
join public.researches r on r.id = ra.research_id
group by a.id;

create view public.public_categories
with (security_invoker = true)
as
select
  c.id,
  c.name,
  count(rc.research_id)::integer as research_count
from public.categories c
left join public.research_categories rc on rc.category_id = c.id
left join public.researches r on r.id = rc.research_id
group by c.id;

grant select on public.public_research, public.public_authors, public.public_categories
to anon, authenticated;

create function public.search_public_research(
  p_query text default null,
  p_category uuid default null,
  p_keyword uuid default null,
  p_author uuid default null,
  p_date_from date default null,
  p_date_to date default null,
  p_sort text default 'relevance',
  p_limit integer default 10,
  p_offset integer default 0
)
returns table (
  id uuid,
  title varchar,
  abstract text,
  publish_date date,
  status public.research_status,
  uploader_id uuid,
  upload_complete boolean,
  view_count integer,
  download_count integer,
  citation_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  authors jsonb,
  categories jsonb,
  keywords jsonb,
  rank real,
  total_count bigint
)
language sql
stable
set search_path = ''
as $$
  with matching as (
    select
      pr.*,
      case
        when nullif(trim(p_query), '') is null then 0::real
        when lower(pr.title) = lower(trim(p_query)) then 3::real
        when pr.title ilike '%' || trim(p_query) || '%' then 2::real
        else 1::real
      end as search_rank
    from public.public_research pr
    where
      (
        nullif(trim(p_query), '') is null
        or pr.title ilike '%' || trim(p_query) || '%'
        or coalesce(pr.abstract, '') ilike '%' || trim(p_query) || '%'
        or exists (
          select 1 from public.research_authors ra
          join public.authors a on a.id = ra.author_id
          where ra.research_id = pr.id and a.name ilike '%' || trim(p_query) || '%'
        )
        or exists (
          select 1 from public.research_categories rc
          join public.categories c on c.id = rc.category_id
          where rc.research_id = pr.id and c.name ilike '%' || trim(p_query) || '%'
        )
        or exists (
          select 1 from public.research_keywords rk
          join public.keywords k on k.id = rk.keyword_id
          where rk.research_id = pr.id and k.name ilike '%' || trim(p_query) || '%'
        )
      )
      and (p_category is null or exists (
        select 1 from public.research_categories rc
        where rc.research_id = pr.id and rc.category_id = p_category
      ))
      and (p_keyword is null or exists (
        select 1 from public.research_keywords rk
        where rk.research_id = pr.id and rk.keyword_id = p_keyword
      ))
      and (p_author is null or exists (
        select 1 from public.research_authors ra
        where ra.research_id = pr.id and ra.author_id = p_author
      ))
      and (p_date_from is null or pr.publish_date >= p_date_from)
      and (p_date_to is null or pr.publish_date <= p_date_to)
  )
  select
    m.id, m.title, m.abstract, m.publish_date, m.status, m.uploader_id,
    m.upload_complete, m.view_count, m.download_count, m.citation_count,
    m.created_at, m.updated_at, m.authors, m.categories, m.keywords,
    m.search_rank, count(*) over ()
  from matching m
  order by
    case when p_sort = 'views' then m.view_count end desc nulls last,
    case when p_sort = 'downloads' then m.download_count end desc nulls last,
    case when p_sort = 'date' then m.publish_date end desc nulls last,
    case when p_sort = 'relevance' then m.search_rank end desc nulls last,
    m.created_at desc
  limit greatest(1, least(p_limit, 100))
  offset greatest(p_offset, 0);
$$;

grant execute on function public.search_public_research(
  text, uuid, uuid, uuid, date, date, text, integer, integer
) to anon, authenticated;
