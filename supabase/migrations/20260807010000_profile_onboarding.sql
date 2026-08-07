alter table public.profiles
add column custom_institution varchar(255),
add column custom_program varchar(255),
add constraint profiles_distinct_institution_choice check (
  institution_id is null or custom_institution is null
),
add constraint profiles_custom_program_choice check (
  custom_program is null or (institution_id is null and program_id is null)
);

create function public.update_profile_settings(
  new_first_name text,
  new_middle_name text,
  new_last_name text,
  new_suffix text,
  new_institution_id uuid,
  new_custom_institution text,
  new_program_id uuid,
  new_custom_program text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_id text := public.current_user_id();
  clean_first_name text := nullif(trim(new_first_name), '');
  clean_middle_name text := nullif(trim(new_middle_name), '');
  clean_last_name text := nullif(trim(new_last_name), '');
  clean_suffix text := nullif(trim(new_suffix), '');
  clean_custom_institution text := nullif(trim(new_custom_institution), '');
  clean_custom_program text := nullif(trim(new_custom_program), '');
begin
  if clean_first_name is null or length(clean_first_name) > 100
    or clean_last_name is null or length(clean_last_name) > 100
    or length(clean_middle_name) > 100 or length(clean_suffix) > 20
    or length(clean_custom_institution) > 255 or length(clean_custom_program) > 255
  then
    raise exception 'Invalid Profile details';
  end if;
  if (new_institution_id is null) = (clean_custom_institution is null) then
    raise exception 'Choose one Institution';
  end if;
  if new_program_id is not null and not exists (
    select 1 from public.programs
    where id = new_program_id and institution_id = new_institution_id
  ) then
    raise exception 'Program must belong to the selected Institution';
  end if;
  if new_institution_id is not null and clean_custom_program is not null then
    raise exception 'Custom Programs require an unlisted Institution';
  end if;

  update public.profiles set
    first_name = clean_first_name,
    middle_name = clean_middle_name,
    last_name = clean_last_name,
    suffix = clean_suffix,
    institution_id = new_institution_id,
    custom_institution = clean_custom_institution,
    program_id = new_program_id,
    custom_program = clean_custom_program,
    updated_at = now()
  where id = user_id and status = 'active';

  if not found then
    raise exception 'Active Profile not found' using errcode = '42501';
  end if;
end;
$$;

revoke update on public.profiles from authenticated;
grant execute on function public.update_profile_settings(
  text, text, text, text, uuid, text, uuid, text
) to authenticated;

create or replace function public.bootstrap_first_admin(target_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'An Admin already exists';
  end if;

  update public.profiles
  set role = 'admin', updated_at = now()
  where lower(email) = lower(trim(target_email))
    and nullif(trim(first_name), '') is not null
    and nullif(trim(last_name), '') is not null
    and (institution_id is not null or nullif(trim(custom_institution), '') is not null);

  if not found then
    raise exception 'Completed Profile not found';
  end if;
end;
$$;

create or replace function public.create_pdf_request(target_research_id uuid, note text)
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

  perform pg_advisory_xact_lock(hashtextextended(user_id || target_research_id::text, 0));
  select * into record from public.researches where id = target_research_id for update;
  select * into requester from public.profiles where id = user_id for update;
  select * into owner from public.profiles where id = record.uploader_id;
  select coalesce(i.name, requester.custom_institution),
    coalesce(p.name, requester.custom_program)
  into institution_name, program_name
  from (select 1) as singleton
  left join public.institutions i on i.id = requester.institution_id
  left join public.programs p on p.id = requester.program_id;

  if record is null or record.status <> 'approved' or not record.upload_complete or record.file_key is null then
    raise exception 'Research PDF is unavailable';
  end if;
  if record.uploader_id = user_id then
    raise exception 'Owners cannot request their own PDF' using errcode = '42501';
  end if;
  if nullif(trim(requester.first_name), '') is null
    or nullif(trim(requester.last_name), '') is null
    or nullif(trim(institution_name), '') is null
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
  ) then
    raise exception 'You can request again 24 hours after your last attempt';
  end if;

  insert into public.pdf_requests (
    research_id, requester_id, research_title, owner_name,
    requester_name, requester_institution, requester_program,
    file_key, request_note
  ) values (
    record.id, user_id, record.title,
    concat_ws(' ', owner.first_name, owner.middle_name, owner.last_name, owner.suffix),
    concat_ws(' ', requester.first_name, requester.middle_name, requester.last_name, requester.suffix),
    institution_name, program_name, record.file_key, clean_note
  ) returning id into created_id;

  insert into public.notifications (user_id, research_id, message)
  values (
    record.uploader_id, record.id,
    concat_ws(' ', requester.first_name, requester.middle_name, requester.last_name, requester.suffix)
      || ' requested access to "' || record.title || '".'
  );

  return created_id;
end;
$$;
