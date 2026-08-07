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
