-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP FUNCTION public.admin_update_account(target_id uuid, new_role public.user_role, new_status public.account_status);

DROP FUNCTION public.authorize_granted_download(IN target_request_id uuid, IN requester uuid);

DROP FUNCTION public.confirm_research_upload(target_id uuid, owner_id uuid);

DROP FUNCTION
  public.search_public_research(IN p_query text, IN p_category uuid, IN p_keyword uuid, IN p_author uuid, IN p_date_from date, IN p_date_to date, IN p_sort text, IN p_limit
  integer, IN p_offset integer);

ALTER TABLE public.audit_logs
  DROP CONSTRAINT audit_logs_admin_id_fkey;

ALTER TABLE public.audit_logs
  ALTER COLUMN admin_id TYPE text USING admin_id::text;

ALTER TABLE public.collections
  DROP CONSTRAINT collections_user_id_fkey;

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_user_id_fkey;

ALTER TABLE public.pdf_requests
  DROP CONSTRAINT pdf_requests_requester_id_fkey;

ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_id_fkey;

ALTER TABLE public.researches
  DROP CONSTRAINT researches_uploader_id_fkey;

DROP VIEW public.public_research;

DROP POLICY "Owners read Authors on their Research Records" ON public.authors;

DROP POLICY "Users add eligible Research Records to their Collection" ON public.collections;

DROP POLICY "Users read their Collection" ON public.collections;

DROP POLICY "Users remove from their Collection" ON public.collections;

ALTER TABLE public.collections
  ALTER COLUMN user_id TYPE text USING user_id::text;

DROP POLICY "Users mark their Notifications read" ON public.notifications;

DROP POLICY "Users read their Notifications" ON public.notifications;

ALTER TABLE public.notifications
  ALTER COLUMN user_id TYPE text USING user_id::text;

DROP POLICY "Users read their PDF requests and Owners read requests" ON public.pdf_requests;

ALTER TABLE public.pdf_requests
  ALTER COLUMN requester_id TYPE text USING requester_id::text;

DROP POLICY "Users read their Profile and Admins read Profiles" ON public.profiles;

DROP POLICY "Users update their active Profile" ON public.profiles;

ALTER TABLE public.profiles
  ALTER COLUMN id TYPE text USING id::text;

DROP POLICY "Owners read their Research Authors" ON public.research_authors;

DROP POLICY "Owners read their Research Categories" ON public.research_categories;

DROP POLICY "Owners read their Research Keywords" ON public.research_keywords;

DROP POLICY "Owners delete their Research Records" ON public.researches;

DROP POLICY "Owners read their Research Records" ON public.researches;

ALTER TABLE public.researches
  ALTER COLUMN uploader_id TYPE text USING uploader_id::text;

CREATE FUNCTION public.admin_update_account (
  target_id  text,
  new_role   public.user_role,
  new_status public.account_status
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  update public.profiles
  set role = new_role, status = new_status, updated_at = now()
  where id = target_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$function$;

ALTER FUNCTION public.admin_update_account(text, public.user_role, public.account_status) OWNER TO postgres;

GRANT ALL ON FUNCTION public.admin_update_account(text, public.user_role, public.account_status) TO authenticated;

CREATE FUNCTION public.authorize_granted_download (
  target_request_id uuid,
  requester         text
)
  RETURNS TABLE (
    research_id uuid,
    file_key    text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

ALTER FUNCTION public.authorize_granted_download(uuid, text) OWNER TO postgres;

GRANT ALL ON FUNCTION public.authorize_granted_download(uuid, text) TO service_role;

CREATE FUNCTION public.confirm_research_upload (
  target_id uuid,
  owner_id  text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  record public.researches;
  affected public.pdf_requests;
begin
  select * into record from public.researches
  where id = target_id and uploader_id = owner_id for update;

  if record.pending_file_key is null then
    if record.upload_complete then return; end if;
    raise exception 'No pending upload to confirm';
  end if;

  if record.file_key is not null and record.file_key <> record.pending_file_key then
    for affected in
      update public.pdf_requests
      set
        status = case status when 'pending' then 'canceled'::public.pdf_request_status else 'revoked'::public.pdf_request_status end,
        updated_at = now()
      where research_id = target_id
        and requester_id is not null
        and status in ('pending', 'granted')
      returning *
    loop
      insert into public.notifications (user_id, research_id, message)
      values (
        affected.requester_id,
        target_id,
        'Your PDF access for "' || affected.research_title || '" was closed because the file was replaced.'
      );
    end loop;
  end if;

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
  where id = target_id;
end;
$function$;

ALTER FUNCTION public.confirm_research_upload(uuid, text) OWNER TO postgres;

GRANT ALL ON FUNCTION public.confirm_research_upload(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.create_pdf_request(uuid, text) FROM anon;

REVOKE ALL ON FUNCTION public.create_pdf_request(uuid, text) FROM service_role;

CREATE OR REPLACE FUNCTION public.create_research_record (
  research_title        text,
  research_abstract     text,
  research_publish_date date,
  research_authors      jsonb,
  category_ids          uuid[] DEFAULT '{}'::uuid[],
  keyword_ids           uuid[] DEFAULT '{}'::uuid[]
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  owner_id text := public.current_user_id();
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
$function$;

CREATE FUNCTION public.current_user_id()
  RETURNS text
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
  select auth.jwt() ->> 'sub';
$function$;

ALTER FUNCTION public.current_user_id() OWNER TO postgres;

GRANT ALL ON FUNCTION public.current_user_id() TO authenticated;

CREATE FUNCTION public.get_current_profile_access()
  RETURNS TABLE (
    role   public.user_role,
    status public.account_status
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select p.role, p.status
  from public.profiles p
  where p.id = (select public.current_user_id());
$function$;

ALTER FUNCTION public.get_current_profile_access() OWNER TO postgres;

GRANT ALL ON FUNCTION public.get_current_profile_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_dashboard (
  requested_scope  text    DEFAULT 'personal'::text,
  requested_period integer DEFAULT 30
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  dashboard_user_id text := public.current_user_id();
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
$function$;

CREATE OR REPLACE FUNCTION public.get_notifications()
  RETURNS SETOF public.notifications
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
  select * from public.notifications
  where user_id = public.current_user_id()
  order by created_at desc;
$function$;

CREATE OR REPLACE FUNCTION public.get_pdf_access_dashboard()
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select jsonb_build_object(
    'mine', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'researchId', q.research_id, 'researchTitle', q.research_title,
        'ownerName', q.owner_name, 'requestNote', q.request_note,
        'status', q.status, 'createdAt', q.created_at
      ) order by q.created_at desc)
      from public.pdf_requests q where q.requester_id = public.current_user_id()
    ), '[]'::jsonb),
    'pending', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'researchId', q.research_id, 'researchTitle', q.research_title,
        'requesterName', q.requester_name, 'requesterInstitution', q.requester_institution,
        'requesterProgram', q.requester_program, 'requestNote', q.request_note,
        'status', q.status, 'createdAt', q.created_at
      ) order by q.created_at desc)
      from public.pdf_requests q
      join public.researches r on r.id = q.research_id
      where r.uploader_id = public.current_user_id() and q.status = 'pending'
    ), '[]'::jsonb),
    'grants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'researchId', q.research_id, 'researchTitle', q.research_title,
        'requesterName', q.requester_name, 'requesterInstitution', q.requester_institution,
        'requesterProgram', q.requester_program, 'status', q.status,
        'createdAt', q.created_at, 'grantedAt', q.granted_at
      ) order by q.granted_at desc)
      from public.pdf_requests q
      join public.researches r on r.id = q.research_id
      where r.uploader_id = public.current_user_id() and q.status = 'granted'
    ), '[]'::jsonb)
  )
  where public.is_active_user();
$function$;

CREATE OR REPLACE FUNCTION public.get_pdf_access_state (
  target_research_id uuid
)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  user_id text := public.current_user_id();
  record public.researches;
  active_request public.pdf_requests;
  latest_request public.pdf_requests;
  available_at timestamptz;
begin
  if user_id is null then
    return jsonb_build_object('state', 'guest');
  end if;

  select * into record from public.researches where id = target_research_id;
  if record is null
    or record.status <> 'approved'
    or not record.upload_complete
    or record.file_key is null
    or record.uploader_id = user_id
    or not public.is_active_user()
  then
    return jsonb_build_object('state', 'unavailable');
  end if;

  select * into active_request
  from public.pdf_requests
  where requester_id = user_id
    and research_id = target_research_id
    and file_key = record.file_key
    and status in ('pending', 'granted')
  limit 1;

  if active_request is not null then
    return jsonb_build_object('state', active_request.status, 'requestId', active_request.id);
  end if;

  select * into latest_request
  from public.pdf_requests
  where requester_id = user_id
    and research_id = target_research_id
    and file_key = record.file_key
  order by updated_at desc
  limit 1;

  available_at := latest_request.updated_at + interval '24 hours';
  if latest_request is not null and available_at > now() then
    return jsonb_build_object(
      'state', 'cooldown',
      'requestId', latest_request.id,
      'availableAt', available_at,
      'reason', latest_request.status
    );
  end if;

  return jsonb_build_object('state', 'requestable');
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_active_user()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.profiles
    where id = (select public.current_user_id()) and status = 'active'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.profiles
    where id = (select public.current_user_id()) and role = 'admin' and status = 'active'
  );
$function$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read()
  RETURNS void
  LANGUAGE sql
  SET search_path TO ''
  AS $function$
  update public.notifications set read = true
  where user_id = public.current_user_id() and not read;
$function$;

CREATE OR REPLACE FUNCTION public.moderate_research (
  target_id uuid,
  decision  public.research_status,
  reason    text                   DEFAULT NULL::text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.record_engagement(uuid, text) FROM service_role;

CREATE OR REPLACE FUNCTION public.resubmit_research (
  target_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE FUNCTION public.search_public_research (
  p_query     text    DEFAULT NULL::text,
  p_category  uuid    DEFAULT NULL::uuid,
  p_keyword   uuid    DEFAULT NULL::uuid,
  p_author    uuid    DEFAULT NULL::uuid,
  p_date_from date    DEFAULT NULL::date,
  p_date_to   date    DEFAULT NULL::date,
  p_sort      text    DEFAULT 'relevance'::text,
  p_limit     integer DEFAULT 10,
  p_offset    integer DEFAULT 0
)
  RETURNS TABLE (
    id                    uuid,
    title                 character varying,
    abstract              text,
    publish_date          date,
    status                public.research_status,
    uploader_id           text,
    upload_complete       boolean,
    view_count            integer,
    download_count        integer,
    citation_export_count integer,
    created_at            timestamp with time zone,
    updated_at            timestamp with time zone,
    authors               jsonb,
    categories            jsonb,
    keywords              jsonb,
    rank                  real,
    total_count           bigint
  )
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
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
$function$;

ALTER FUNCTION public.search_public_research(text, uuid, uuid, uuid, date, date, text, integer, integer) OWNER TO postgres;

GRANT ALL ON FUNCTION public.search_public_research(text, uuid, uuid, uuid, date, date, text, integer, integer) TO anon;

GRANT ALL ON FUNCTION public.search_public_research(text, uuid, uuid, uuid, date, date, text, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_pdf_request (
  target_request_id uuid,
  action            text
)
  RETURNS public.pdf_request_status
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  user_id text := public.current_user_id();
  request public.pdf_requests;
  record public.researches;
  next_status public.pdf_request_status;
begin
  if user_id is null or not public.is_active_user() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into request from public.pdf_requests where id = target_request_id for update;
  select * into record from public.researches where id = request.research_id for update;

  if action = 'cancel' and request.status = 'pending' and request.requester_id = user_id then
    next_status := 'canceled';
  elsif action in ('approve', 'reject') and request.status = 'pending' and record.uploader_id = user_id then
    next_status := case action when 'approve' then 'granted'::public.pdf_request_status else 'rejected'::public.pdf_request_status end;
    if action = 'approve'
      and (record.status <> 'approved' or not record.upload_complete or record.file_key <> request.file_key)
    then
      raise exception 'The Research PDF changed; try again';
    end if;
  elsif action = 'revoke' and request.status = 'granted' and record.uploader_id = user_id then
    next_status := 'revoked';
  else
    raise exception 'PDF Access request not found' using errcode = '42501';
  end if;

  update public.pdf_requests
  set
    status = next_status,
    granted_at = case when next_status = 'granted' then now() else granted_at end,
    updated_at = now()
  where id = target_request_id;

  insert into public.notifications (user_id, research_id, message)
  values (
    case when next_status = 'canceled' then record.uploader_id else request.requester_id end,
    request.research_id,
    case next_status
      when 'canceled' then request.requester_name || ' canceled their request for "' || request.research_title || '".'
      when 'granted' then 'Your request for "' || request.research_title || '" was approved.'
      when 'rejected' then 'Your request for "' || request.research_title || '" was rejected.'
      when 'revoked' then 'Your access to "' || request.research_title || '" was revoked.'
    end
  );

  return next_status;
end;
$function$;

REVOKE ALL ON FUNCTION public.update_profile_settings(text, text, text, text, uuid, text, uuid, text) FROM anon;

REVOKE ALL ON FUNCTION public.update_profile_settings(text, text, text, text, uuid, text, uuid, text) FROM service_role;

CREATE OR REPLACE FUNCTION public.update_research_record (
  target_id             uuid,
  research_title        text,
  research_abstract     text,
  research_publish_date date,
  research_authors      jsonb,
  category_ids          uuid[] DEFAULT '{}'::uuid[],
  keyword_ids           uuid[] DEFAULT '{}'::uuid[]
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id);

CREATE POLICY "Owners read Authors on their Research Records" ON public.authors
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (public.research_authors ra
     JOIN public.researches r ON ((r.id = ra.research_id)))
  WHERE ((ra.author_id = authors.id) AND (r.uploader_id = ( SELECT public.current_user_id() AS current_user_id)) AND ( SELECT public.is_active_user() AS is_active_user)))));

ALTER TABLE public.collections
  ADD CONSTRAINT collections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE POLICY "Users add eligible Research Records to their Collection" ON public.collections
  FOR INSERT
  TO authenticated
  WITH CHECK (((user_id = ( SELECT public.current_user_id() AS current_user_id)) AND ( SELECT public.is_active_user() AS is_active_user) AND (EXISTS ( SELECT 1
   FROM public.researches r
  WHERE ((r.id = collections.research_id) AND (r.status = 'approved'::public.research_status) AND r.upload_complete)))));

CREATE POLICY "Users read their Collection" ON public.collections
  FOR SELECT
  TO authenticated
  USING (((user_id = ( SELECT public.current_user_id() AS current_user_id)) AND ( SELECT public.is_active_user() AS is_active_user)));

CREATE POLICY "Users remove from their Collection" ON public.collections
  FOR DELETE
  TO authenticated
  USING (((user_id = ( SELECT public.current_user_id() AS current_user_id)) AND ( SELECT public.is_active_user() AS is_active_user)));

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE POLICY "Users mark their Notifications read" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (((user_id = ( SELECT public.current_user_id() AS current_user_id)) AND ( SELECT public.is_active_user() AS is_active_user)))
  WITH CHECK (((user_id = ( SELECT public.current_user_id() AS current_user_id)) AND ( SELECT public.is_active_user() AS is_active_user)));

CREATE POLICY "Users read their Notifications" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (((user_id = ( SELECT public.current_user_id() AS current_user_id)) AND ( SELECT public.is_active_user() AS is_active_user)));

ALTER TABLE public.pdf_requests
  ADD CONSTRAINT pdf_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE POLICY "Users read their PDF requests and Owners read requests" ON public.pdf_requests
  FOR SELECT
  TO authenticated
  USING (((requester_id = ( SELECT public.current_user_id() AS current_user_id)) OR (EXISTS ( SELECT 1
   FROM public.researches r
  WHERE ((r.id = pdf_requests.research_id) AND (r.uploader_id = ( SELECT public.current_user_id() AS current_user_id)))))));

CREATE POLICY "Users read their Profile and Admins read Profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((((id = ( SELECT public.current_user_id() AS current_user_id)) AND (status = 'active'::public.account_status)) OR ( SELECT public.is_admin() AS is_admin)));

CREATE POLICY "Users update their active Profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (((id = ( SELECT public.current_user_id() AS current_user_id)) AND (status = 'active'::public.account_status)))
  WITH CHECK (((id = ( SELECT public.current_user_id() AS current_user_id)) AND (status = 'active'::public.account_status)));

GRANT INSERT ON public.profiles TO service_role;

CREATE POLICY "Owners read their Research Authors" ON public.research_authors
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.researches r
  WHERE
    ((r.id = research_authors.research_id) AND (r.uploader_id = ( SELECT public.current_user_id() AS current_user_id)) AND ( SELECT public.is_active_user() AS is_active_user)))));

CREATE POLICY "Owners read their Research Categories" ON public.research_categories
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.researches r
  WHERE
    ((r.id = research_categories.research_id) AND (r.uploader_id = ( SELECT public.current_user_id() AS current_user_id)) AND ( SELECT public.is_active_user() AS
    is_active_user)))));

CREATE POLICY "Owners read their Research Keywords" ON public.research_keywords
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.researches r
  WHERE
    ((r.id = research_keywords.research_id) AND (r.uploader_id = ( SELECT public.current_user_id() AS current_user_id)) AND ( SELECT public.is_active_user() AS is_active_user)))));

ALTER TABLE public.researches
  ADD CONSTRAINT researches_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES public.profiles(id);

CREATE POLICY "Owners delete their Research Records" ON public.researches
  FOR DELETE
  TO authenticated
  USING (((uploader_id = ( SELECT public.current_user_id() AS current_user_id)) AND ( SELECT public.is_active_user() AS is_active_user)));

CREATE POLICY "Owners read their Research Records" ON public.researches
  FOR SELECT
  TO authenticated
  USING (((uploader_id = ( SELECT public.current_user_id() AS current_user_id)) AND ( SELECT public.is_active_user() AS is_active_user)));

CREATE VIEW public.public_research WITH (security_invoker=true) AS SELECT id,
    title,
    abstract,
    publish_date,
    status,
    uploader_id,
    upload_complete,
    view_count,
    download_count,
    citation_export_count,
    created_at,
    updated_at,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'email', a.email) ORDER BY a.name) AS jsonb_agg
           FROM (public.research_authors ra
             JOIN public.authors a ON ((a.id = ra.author_id)))
          WHERE (ra.research_id = r.id)), '[]'::jsonb) AS authors,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) ORDER BY c.name) AS jsonb_agg
           FROM (public.research_categories rc
             JOIN public.categories c ON ((c.id = rc.category_id)))
          WHERE (rc.research_id = r.id)), '[]'::jsonb) AS categories,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', k.id, 'name', k.name) ORDER BY k.name) AS jsonb_agg
           FROM (public.research_keywords rk
             JOIN public.keywords k ON ((k.id = rk.keyword_id)))
          WHERE (rk.research_id = r.id)), '[]'::jsonb) AS keywords,
    rejection_reason
   FROM public.researches r;

ALTER VIEW public.public_research OWNER TO postgres;

GRANT SELECT ON public.public_research TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.authorize_granted_download(uuid, text)
FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_research_upload(uuid, text)
FROM public, anon, authenticated;
