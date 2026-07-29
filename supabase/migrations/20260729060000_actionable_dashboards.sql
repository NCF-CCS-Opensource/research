drop function public.search_public_research(
  text, uuid, uuid, uuid, date, date, text, integer, integer
);

alter table public.researches
rename column citation_count to citation_export_count;

alter view public.public_research
rename column citation_count to citation_export_count;

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
  citation_export_count integer,
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
    m.upload_complete, m.view_count, m.download_count, m.citation_export_count,
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

create table public.engagement_daily (
  research_id uuid not null references public.researches (id) on delete cascade,
  day date not null,
  view_count integer not null default 0 check (view_count >= 0),
  download_count integer not null default 0 check (download_count >= 0),
  citation_export_count integer not null default 0 check (citation_export_count >= 0),
  primary key (research_id, day)
);

alter table public.engagement_daily enable row level security;
grant select, insert, update, delete on public.engagement_daily to service_role;

create or replace function public.record_engagement(
  target_research_id uuid,
  kind text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  recorded_id uuid;
begin
  if kind is null or kind not in ('view', 'citation_export') then
    raise exception 'Invalid Engagement Count';
  end if;

  update public.researches
  set
    view_count = view_count + case when kind = 'view' then 1 else 0 end,
    citation_export_count = citation_export_count
      + case when kind = 'citation_export' then 1 else 0 end
  where id = target_research_id and status = 'approved'
  returning id into recorded_id;

  if recorded_id is not null then
    insert into public.engagement_daily (
      research_id,
      day,
      view_count,
      citation_export_count
    )
    values (
      recorded_id,
      (now() at time zone 'utc')::date,
      case when kind = 'view' then 1 else 0 end,
      case when kind = 'citation_export' then 1 else 0 end
    )
    on conflict on constraint engagement_daily_pkey do update
    set
      view_count = public.engagement_daily.view_count + excluded.view_count,
      citation_export_count = public.engagement_daily.citation_export_count
        + excluded.citation_export_count;
  end if;
end;
$$;

create or replace function public.authorize_granted_download(
  target_request_id uuid,
  requester uuid
)
returns table (research_id uuid, file_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed_research_id uuid;
  allowed_file_key text;
begin
  select r.id, r.file_key
  into allowed_research_id, allowed_file_key
  from public.researches r
  join public.pdf_requests q on q.research_id = r.id
  where q.id = target_request_id
    and q.requester_id = requester
    and q.status = 'granted'
    and q.file_key = r.file_key
    and r.status = 'approved'
    and r.upload_complete
  for update of r;

  if allowed_research_id is not null then
    update public.researches
    set download_count = download_count + 1
    where id = allowed_research_id;

    insert into public.engagement_daily (
      research_id,
      day,
      download_count
    )
    values (
      allowed_research_id,
      (now() at time zone 'utc')::date,
      1
    )
    on conflict on constraint engagement_daily_pkey do update
    set download_count = public.engagement_daily.download_count + 1;

    return query select allowed_research_id, allowed_file_key;
  end if;
end;
$$;

create function public.get_dashboard(
  requested_scope text default 'personal',
  requested_period integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  dashboard_user_id uuid := auth.uid();
  user_is_admin boolean;
  dashboard_mode text;
  cards jsonb;
  docket jsonb := '[]'::jsonb;
  recent_activity jsonb := '[]'::jsonb;
  comparisons jsonb := '[]'::jsonb;
  recent_audit jsonb := '[]'::jsonb;
  pulse jsonb;
  today date := (now() at time zone 'utc')::date;
  current_start date;
  previous_start date;
  earliest_day date;
  current_totals jsonb;
  previous_totals jsonb;
  daily_values jsonb;
begin
  if dashboard_user_id is null or not public.is_active_user() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if requested_scope is null or requested_scope not in ('personal', 'admin') then
    raise exception 'Invalid dashboard scope';
  end if;
  if requested_period is null or requested_period not in (30, 90) then
    raise exception 'Engagement Trend period must be 30 or 90 days';
  end if;

  user_is_admin := public.is_admin();
  if requested_scope = 'admin' and not user_is_admin then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if requested_scope = 'admin' then
    dashboard_mode := 'admin';

    select jsonb_build_object(
      'readyForModeration', count(*) filter (
        where r.status = 'pending'
          and r.upload_complete
          and r.file_key is not null
      ),
      'activeAccounts', (select count(*) from public.profiles where status = 'active'),
      'recentRegistrations', (
        select count(*) from public.profiles
        where created_at >= now() - interval '30 days'
      ),
      'approvedResearch', count(*) filter (where r.status = 'approved'),
      'pdfAccessRequestsLast30Days', (
        select count(*) from public.pdf_requests
        where created_at >= now() - interval '30 days'
      )
    )
    into cards
    from public.researches r;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', ready.id,
        'kind', 'ready_for_moderation',
        'title', ready.title,
        'detail', 'Completed Upload · awaiting review',
        'createdAt', ready.created_at,
        'href', '/admin/research'
      )
      order by ready.created_at
    ), '[]'::jsonb)
    into docket
    from (
      select id, title, created_at
      from public.researches
      where status = 'pending'
        and upload_complete
        and file_key is not null
      order by created_at
      limit 6
    ) ready;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'action', activity.action,
        'title', coalesce(activity.title, 'Account or metadata activity'),
        'createdAt', activity.created_at,
        'href', '/admin/audit'
      )
      order by activity.created_at desc
    ), '[]'::jsonb)
    into recent_audit
    from (
      select logs.action, logs.created_at, r.title
      from public.audit_logs logs
      left join public.researches r on r.id = logs.research_id
      order by logs.created_at desc
      limit 6
    ) activity;
  else
    if exists (
      select 1 from public.researches where uploader_id = dashboard_user_id
    ) then
      dashboard_mode := 'owner';

      select jsonb_build_object(
        'ownedResearch', count(*),
        'researchViews', coalesce(sum(view_count), 0),
        'authorizedDownloads', coalesce(sum(download_count), 0),
        'citationExports', coalesce(sum(citation_export_count), 0)
      )
      into cards
      from public.researches
      where uploader_id = dashboard_user_id;

      docket := jsonb_build_array(
        jsonb_build_object(
          'kind', 'incomplete_uploads',
          'label', 'Incomplete Research PDF uploads',
          'count', (
            select count(*) from public.researches
            where uploader_id = dashboard_user_id and not upload_complete
          ),
          'href', '/dashboard/papers'
        ),
        jsonb_build_object(
          'kind', 'rejected_records',
          'label', 'Rejected Research Records',
          'count', (
            select count(*) from public.researches
            where uploader_id = dashboard_user_id and status = 'rejected'
          ),
          'href', '/dashboard/papers'
        ),
        jsonb_build_object(
          'kind', 'pending_pdf_requests',
          'label', 'Incoming PDF Access Requests',
          'count', (
            select count(*)
            from public.pdf_requests q
            join public.researches r on r.id = q.research_id
            where r.uploader_id = dashboard_user_id and q.status = 'pending'
          ),
          'href', '/dashboard/pdf-requests'
        ),
        jsonb_build_object(
          'kind', 'unread_notifications',
          'label', 'Unread notifications',
          'count', (
            select count(*) from public.notifications
            where user_id = dashboard_user_id and not read
          ),
          'href', '/dashboard/notifications'
        )
      );

      select coalesce(jsonb_agg(
        jsonb_build_object(
          'id', records.id,
          'title', records.title,
          'researchViews', records.view_count,
          'authorizedDownloads', records.download_count,
          'citationExports', records.citation_export_count,
          'pendingRequests', (
            select count(*) from public.pdf_requests q
            where q.research_id = records.id and q.status = 'pending'
          )
        )
        order by records.created_at desc
      ), '[]'::jsonb)
      into comparisons
      from public.researches records
      where records.uploader_id = dashboard_user_id;
    else
      dashboard_mode := 'reader';

      cards := jsonb_build_object(
        'savedResearch', (
          select count(*) from public.collections
          where user_id = dashboard_user_id
        ),
        'pendingPdfRequests', (
          select count(*) from public.pdf_requests
          where requester_id = dashboard_user_id and status = 'pending'
        ),
        'grantedResearchPdfs', (
          select count(*) from public.pdf_requests
          where requester_id = dashboard_user_id and status = 'granted'
        ),
        'unreadNotifications', (
          select count(*) from public.notifications
          where user_id = dashboard_user_id and not read
        )
      );

      select coalesce(jsonb_agg(
        jsonb_build_object(
          'kind', activity.kind,
          'title', activity.title,
          'detail', activity.detail,
          'occurredAt', activity.occurred_at,
          'href', activity.href
        )
        order by activity.occurred_at desc
      ), '[]'::jsonb)
      into recent_activity
      from (
        select
          'collection'::text as kind,
          r.title,
          'Saved to Collection'::text as detail,
          c.created_at as occurred_at,
          '/dashboard/collections'::text as href
        from public.collections c
        join public.researches r on r.id = c.research_id
        where c.user_id = dashboard_user_id
        union all
        select
          'pdf_access'::text,
          q.research_title,
          initcap(q.status::text) || ' PDF Access Request',
          q.updated_at,
          '/dashboard/pdf-requests'::text
        from public.pdf_requests q
        where q.requester_id = dashboard_user_id
        order by occurred_at desc
        limit 6
      ) activity;
    end if;
  end if;

  if dashboard_mode in ('owner', 'admin') then
    current_start := today - (requested_period - 1);
    previous_start := current_start - requested_period;

    select min(d.day)
    into earliest_day
    from public.engagement_daily d
    join public.researches r on r.id = d.research_id
    where requested_scope = 'admin'
      or r.uploader_id = dashboard_user_id;

    select jsonb_build_object(
      'researchViews', coalesce(sum(d.view_count), 0),
      'authorizedDownloads', coalesce(sum(d.download_count), 0),
      'citationExports', coalesce(sum(d.citation_export_count), 0)
    )
    into current_totals
    from public.engagement_daily d
    join public.researches r on r.id = d.research_id
    where (
      requested_scope = 'admin'
      or r.uploader_id = dashboard_user_id
    )
      and d.day between current_start and today;

    select jsonb_build_object(
      'researchViews', coalesce(sum(d.view_count), 0),
      'authorizedDownloads', coalesce(sum(d.download_count), 0),
      'citationExports', coalesce(sum(d.citation_export_count), 0)
    )
    into previous_totals
    from public.engagement_daily d
    join public.researches r on r.id = d.research_id
    where (
      requested_scope = 'admin'
      or r.uploader_id = dashboard_user_id
    )
      and d.day between previous_start and current_start - 1;

    if earliest_day is null then
      daily_values := '[]'::jsonb;
    else
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'date', totals.day,
          'researchViews', totals.view_count,
          'authorizedDownloads', totals.download_count,
          'citationExports', totals.citation_export_count
        )
        order by totals.day
      ), '[]'::jsonb)
      into daily_values
      from (
        select
          calendar.day::date as day,
          coalesce(sum(d.view_count), 0) as view_count,
          coalesce(sum(d.download_count), 0) as download_count,
          coalesce(sum(d.citation_export_count), 0) as citation_export_count
        from generate_series(
          greatest(earliest_day, current_start)::timestamp,
          today::timestamp,
          interval '1 day'
        ) calendar(day)
        left join public.engagement_daily d
          on d.day = calendar.day::date
          and exists (
            select 1 from public.researches r
            where r.id = d.research_id
              and (
                requested_scope = 'admin'
                or r.uploader_id = dashboard_user_id
              )
          )
        group by calendar.day
      ) totals;
    end if;

    pulse := jsonb_build_object(
      'period', requested_period,
      'current', current_totals,
      'previous', previous_totals,
      'earliestAvailableDate', earliest_day,
      'days', daily_values
    );
  end if;

  return jsonb_build_object(
    'scope', requested_scope,
    'mode', dashboard_mode,
    'isAdmin', user_is_admin,
    'generatedAt', now(),
    'cards', cards,
    'docket', docket,
    'recentActivity', recent_activity,
    'comparisons', comparisons,
    'recentAudit', recent_audit,
    'pulse', pulse
  );
end;
$$;

grant execute on function public.get_dashboard(text, integer) to authenticated;
drop function public.get_engagement_overview();
