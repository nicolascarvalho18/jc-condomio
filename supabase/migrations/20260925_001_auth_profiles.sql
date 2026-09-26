-- Supabase-only authentication foundation for JC Condomínio.
-- Run this migration with the Supabase CLI or SQL Editor while authenticated as
-- the project owner. Do not run it from the browser or expose privileged keys.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  email text not null unique,
  role text not null check (role in ('ADMIN', 'FINANCEIRO', 'OPERADOR', 'CONSULTA')),
  company_id uuid not null,
  company_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A signed-in user can read only the own profile. Application data will receive
-- separate tenant policies in the following data migration.
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() and active = true);

-- Profiles are provisioned by a controlled database migration/admin workflow;
-- authenticated clients cannot self-promote or edit roles/company ownership.

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_profile_updated_at();
