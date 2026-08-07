create type public.user_role as enum ('user', 'admin');
create type public.account_status as enum ('active', 'suspended');

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null unique
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  institution_id uuid references public.institutions (id) on delete restrict,
  unique (name, institution_id)
);

create table public.profiles (
  id text primary key,
  email varchar(255) not null,
  first_name varchar(100) not null,
  middle_name varchar(100),
  last_name varchar(100) not null,
  suffix varchar(20),
  institution_id uuid references public.institutions (id) on delete set null,
  program_id uuid references public.programs (id) on delete set null,
  role public.user_role not null default 'user',
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.institutions enable row level security;
alter table public.programs enable row level security;
alter table public.profiles enable row level security;

alter table public.researches
add constraint researches_uploader_id_fkey
foreign key (uploader_id) references public.profiles (id);

create function public.current_user_id()
returns text
language sql
stable
set search_path = ''
as $$
  select auth.jwt() ->> 'sub';
$$;

create function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select public.current_user_id()) and status = 'active'
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select public.current_user_id()) and role = 'admin' and status = 'active'
  );
$$;

create function public.get_current_profile_access()
returns table (role public.user_role, status public.account_status)
language sql
stable
security definer
set search_path = ''
as $$
  select p.role, p.status
  from public.profiles p
  where p.id = (select public.current_user_id());
$$;

create policy "Public reads Institutions"
on public.institutions for select
to anon, authenticated
using (true);

create policy "Public reads Programs"
on public.programs for select
to anon, authenticated
using (true);

create policy "Users read their Profile and Admins read Profiles"
on public.profiles for select
to authenticated
using (
  (id = (select public.current_user_id()) and status = 'active')
  or (select public.is_admin())
);

create policy "Users update their active Profile"
on public.profiles for update
to authenticated
using (id = (select public.current_user_id()) and status = 'active')
with check (id = (select public.current_user_id()) and status = 'active');

grant select on public.institutions, public.programs to anon, authenticated;
grant select on public.profiles to authenticated;
grant insert on public.profiles to service_role;
grant update (
  first_name, middle_name, last_name, suffix, institution_id, program_id, updated_at
) on public.profiles to authenticated;
grant execute on function public.current_user_id(), public.is_active_user(), public.is_admin()
to authenticated;
revoke all on function public.get_current_profile_access() from public, anon;
grant execute on function public.get_current_profile_access() to authenticated;

create function public.bootstrap_first_admin(target_email text)
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
  where lower(email) = lower(trim(target_email));

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke all on function public.bootstrap_first_admin(text) from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(text) to service_role;

create function public.admin_update_account(
  target_id text,
  new_role public.user_role,
  new_status public.account_status
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

  update public.profiles
  set role = new_role, status = new_status, updated_at = now()
  where id = target_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

grant execute on function public.admin_update_account(
  text, public.user_role, public.account_status
) to authenticated;
