create function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text := nullif(trim(new.email), '');
  clean_first_name text := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
  clean_middle_name text := nullif(trim(new.raw_user_meta_data ->> 'middle_name'), '');
  clean_last_name text := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');
  clean_suffix text := nullif(trim(new.raw_user_meta_data ->> 'suffix'), '');
  clean_custom_institution text := nullif(trim(new.raw_user_meta_data ->> 'custom_institution'), '');
  clean_custom_program text := nullif(trim(new.raw_user_meta_data ->> 'custom_program'), '');
  selected_institution_id uuid;
  selected_program_id uuid;
begin
  begin
    selected_institution_id := nullif(trim(new.raw_user_meta_data ->> 'institution_id'), '')::uuid;
    selected_program_id := nullif(trim(new.raw_user_meta_data ->> 'program_id'), '')::uuid;
  exception when invalid_text_representation then
    raise exception 'Invalid Registration details';
  end;

  if clean_email is null or length(clean_email) > 255
    or clean_first_name is null or length(clean_first_name) > 100
    or clean_last_name is null or length(clean_last_name) > 100
    or length(clean_middle_name) > 100 or length(clean_suffix) > 20
    or length(clean_custom_institution) > 255 or length(clean_custom_program) > 255
  then
    raise exception 'Invalid Registration details';
  end if;
  if (selected_institution_id is null) = (clean_custom_institution is null) then
    raise exception 'Choose one Institution';
  end if;
  if selected_institution_id is not null and not exists (
    select 1 from public.institutions where id = selected_institution_id
  ) then
    raise exception 'Invalid Institution';
  end if;
  if selected_program_id is not null and not exists (
    select 1 from public.programs
    where id = selected_program_id and institution_id = selected_institution_id
  ) then
    raise exception 'Program must belong to the selected Institution';
  end if;
  if selected_institution_id is not null and clean_custom_program is not null then
    raise exception 'Custom Programs require an unlisted Institution';
  end if;

  insert into public.profiles (
    id,
    email,
    first_name,
    middle_name,
    last_name,
    suffix,
    institution_id,
    custom_institution,
    program_id,
    custom_program
  ) values (
    new.id,
    clean_email,
    clean_first_name,
    clean_middle_name,
    clean_last_name,
    clean_suffix,
    selected_institution_id,
    clean_custom_institution,
    selected_program_id,
    clean_custom_program
  );

  return new;
end;
$$;

create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

with registrations as (
  select
    auth_user.id,
    nullif(trim(auth_user.email), '') as email,
    nullif(trim(auth_user.raw_user_meta_data ->> 'first_name'), '') as first_name,
    nullif(trim(auth_user.raw_user_meta_data ->> 'middle_name'), '') as middle_name,
    nullif(trim(auth_user.raw_user_meta_data ->> 'last_name'), '') as last_name,
    nullif(trim(auth_user.raw_user_meta_data ->> 'suffix'), '') as suffix,
    nullif(trim(auth_user.raw_user_meta_data ->> 'institution_id'), '') as institution_id,
    nullif(trim(auth_user.raw_user_meta_data ->> 'custom_institution'), '') as custom_institution,
    nullif(trim(auth_user.raw_user_meta_data ->> 'program_id'), '') as program_id,
    nullif(trim(auth_user.raw_user_meta_data ->> 'custom_program'), '') as custom_program
  from auth.users auth_user
)
insert into public.profiles (
  id,
  email,
  first_name,
  middle_name,
  last_name,
  suffix,
  institution_id,
  custom_institution,
  program_id,
  custom_program
)
select
  registration.id,
  registration.email,
  registration.first_name,
  registration.middle_name,
  registration.last_name,
  registration.suffix,
  institution.id,
  registration.custom_institution,
  program.id,
  registration.custom_program
from registrations registration
left join public.institutions institution
  on institution.id::text = registration.institution_id
left join public.programs program
  on program.id::text = registration.program_id
  and program.institution_id = institution.id
where registration.email is not null
  and length(registration.email) <= 255
  and registration.first_name is not null
  and length(registration.first_name) <= 100
  and coalesce(length(registration.middle_name), 0) <= 100
  and registration.last_name is not null
  and length(registration.last_name) <= 100
  and coalesce(length(registration.suffix), 0) <= 20
  and coalesce(length(registration.custom_institution), 0) <= 255
  and coalesce(length(registration.custom_program), 0) <= 255
  and (
    (registration.institution_id is not null
      and institution.id is not null
      and registration.custom_institution is null)
    or (registration.institution_id is null
      and registration.custom_institution is not null)
  )
  and (registration.program_id is null or program.id is not null)
  and (registration.custom_program is null or (
    registration.institution_id is null
    and registration.program_id is null
  ))
on conflict (id) do nothing;
