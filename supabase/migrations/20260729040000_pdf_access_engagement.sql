create type public.pdf_request_status as enum (
  'pending', 'granted', 'canceled', 'rejected', 'revoked'
);

create table public.pdf_requests (
  id uuid primary key default gen_random_uuid(),
  research_id uuid references public.researches (id) on delete set null,
  requester_id text references public.profiles (id) on delete set null,
  research_title varchar(500) not null,
  owner_name varchar(500) not null,
  requester_name varchar(500) not null,
  requester_institution varchar(500) not null,
  requester_program varchar(500),
  file_key varchar(500) not null,
  request_note text not null check (length(request_note) between 1 and 1000),
  status public.pdf_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  granted_at timestamptz
);

create unique index pdf_requests_one_active_per_pdf
on public.pdf_requests (requester_id, research_id, file_key)
where status in ('pending', 'granted');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles (id) on delete cascade,
  research_id uuid references public.researches (id) on delete set null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.pdf_requests enable row level security;
alter table public.notifications enable row level security;

create policy "Users read their PDF requests and Owners read requests"
on public.pdf_requests for select to authenticated
using (
  requester_id = (select public.current_user_id())
  or exists (
    select 1 from public.researches r
    where r.id = research_id and r.uploader_id = (select public.current_user_id())
  )
);

create policy "Users read their Notifications"
on public.notifications for select to authenticated
using (user_id = (select public.current_user_id()) and (select public.is_active_user()));

create policy "Users mark their Notifications read"
on public.notifications for update to authenticated
using (user_id = (select public.current_user_id()) and (select public.is_active_user()))
with check (user_id = (select public.current_user_id()) and (select public.is_active_user()));

grant select on public.pdf_requests to authenticated;
grant select, update (read) on public.notifications to authenticated;
grant select, insert, update, delete on public.pdf_requests, public.notifications to service_role;
grant select, insert, update, delete on public.institutions, public.programs to service_role;

create function public.get_pdf_access_state(target_research_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
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
$$;

create function public.create_pdf_request(target_research_id uuid, note text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_id text := public.current_user_id();
  record public.researches;
  requester public.profiles;
  owner public.profiles;
  institution_name text;
  program_name text;
  clean_note text := trim(note);
  created_id uuid;
begin
  if user_id is null or not public.is_active_user() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if clean_note is null or length(clean_note) not between 1 and 1000 then
    raise exception 'Request Note must be between 1 and 1,000 characters';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(user_id::text || target_research_id::text, 0));
  select * into record from public.researches where id = target_research_id for update;
  select * into requester from public.profiles where id = user_id for update;
  select * into owner from public.profiles where id = record.uploader_id;
  select name into institution_name from public.institutions where id = requester.institution_id;
  select name into program_name from public.programs where id = requester.program_id;

  if record is null or record.status <> 'approved' or not record.upload_complete or record.file_key is null then
    raise exception 'Research PDF is unavailable';
  end if;
  if record.uploader_id = user_id then
    raise exception 'Owners cannot request their own PDF' using errcode = '42501';
  end if;
  if nullif(trim(requester.first_name), '') is null
    or nullif(trim(requester.last_name), '') is null
    or requester.institution_id is null
    or institution_name is null
  then
    raise exception 'Complete Requester Identity is required';
  end if;
  if exists (
    select 1 from public.pdf_requests
    where requester_id = user_id and research_id = target_research_id
      and file_key = record.file_key and status in ('pending', 'granted')
  ) then
    raise exception 'A pending request or active Grant already exists';
  end if;
  if exists (
    select 1 from public.pdf_requests
    where requester_id = user_id and research_id = target_research_id
      and file_key = record.file_key and updated_at > now() - interval '24 hours'
    order by updated_at desc
    limit 1
  ) then
    raise exception 'You can request again 24 hours after your last attempt';
  end if;

  insert into public.pdf_requests (
    research_id, requester_id, research_title, owner_name,
    requester_name, requester_institution, requester_program,
    file_key, request_note
  ) values (
    record.id,
    user_id,
    record.title,
    concat_ws(' ', owner.first_name, owner.middle_name, owner.last_name, owner.suffix),
    concat_ws(' ', requester.first_name, requester.middle_name, requester.last_name, requester.suffix),
    institution_name,
    program_name,
    record.file_key,
    clean_note
  ) returning id into created_id;

  insert into public.notifications (user_id, research_id, message)
  values (
    record.uploader_id,
    record.id,
    concat_ws(' ', requester.first_name, requester.middle_name, requester.last_name, requester.suffix)
      || ' requested access to "' || record.title || '".'
  );

  return created_id;
end;
$$;

create function public.transition_pdf_request(target_request_id uuid, action text)
returns public.pdf_request_status
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

create function public.get_pdf_access_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
$$;

create function public.get_notifications()
returns setof public.notifications
language sql
stable
security invoker
set search_path = ''
as $$
  select * from public.notifications
  where user_id = public.current_user_id()
  order by created_at desc;
$$;

create function public.mark_notifications_read()
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.notifications set read = true
  where user_id = public.current_user_id() and not read;
$$;

create function public.record_engagement(target_research_id uuid, kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if kind not in ('view', 'citation') then
    raise exception 'Invalid Engagement Count';
  end if;
  update public.researches
  set
    view_count = view_count + case when kind = 'view' then 1 else 0 end,
    citation_count = citation_count + case when kind = 'citation' then 1 else 0 end
  where id = target_research_id and status = 'approved';
end;
$$;

create function public.get_engagement_overview()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'totalResearches', count(*),
    'totalViews', coalesce(sum(r.view_count), 0),
    'totalDownloads', coalesce(sum(r.download_count), 0),
    'totalCitations', coalesce(sum(r.citation_count), 0),
    'totalUsers', case when public.is_admin()
      then (select count(*) from public.profiles)
      else null
    end
  )
  from public.researches r
  where public.is_admin() or r.uploader_id = public.current_user_id();
$$;

create function public.authorize_granted_download(target_request_id uuid, requester text)
returns table (research_id uuid, file_key text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.researches r
  set download_count = r.download_count + 1
  from public.pdf_requests q
  where q.id = target_request_id
    and q.requester_id = requester
    and q.status = 'granted'
    and q.research_id = r.id
    and q.file_key = r.file_key
    and r.status = 'approved'
    and r.upload_complete
  returning r.id, r.file_key::text;
end;
$$;

create or replace function public.confirm_research_upload(target_id uuid, owner_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

grant execute on function public.get_pdf_access_state(uuid) to anon, authenticated;
grant execute on function public.create_pdf_request(uuid, text) to authenticated;
grant execute on function public.transition_pdf_request(uuid, text) to authenticated;
grant execute on function public.get_pdf_access_dashboard() to authenticated;
grant execute on function public.get_notifications() to authenticated;
grant execute on function public.mark_notifications_read() to authenticated;
grant execute on function public.record_engagement(uuid, text) to anon, authenticated;
grant execute on function public.get_engagement_overview() to authenticated;
revoke all on function public.authorize_granted_download(uuid, text) from public, anon, authenticated;
grant execute on function public.authorize_granted_download(uuid, text) to service_role;
revoke all on function public.confirm_research_upload(uuid, text) from public, anon, authenticated;
grant execute on function public.confirm_research_upload(uuid, text) to service_role;
