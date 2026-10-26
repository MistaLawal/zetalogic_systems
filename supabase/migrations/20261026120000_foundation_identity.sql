-- Phase 2 / 1: identity, roles and shared helpers
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create type public.app_role as enum ('super_admin', 'store_manager', 'order_manager', 'content_manager', 'customer_support');

-- updated_at helper
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Profiles: one row per auth user
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Staff roles. Authorization data lives here, never in user-editable metadata.
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- Role check used by RLS policies. SECURITY DEFINER so it can read user_roles
-- regardless of that table's own policies; lives in the unexposed `private`
-- schema and only ever checks the caller's own uid.
create or replace function private.has_any_role(roles public.app_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = any (roles)
  );
$$;
revoke all on function private.has_any_role(public.app_role[]) from public;
grant execute on function private.has_any_role(public.app_role[]) to anon, authenticated;

create or replace function private.is_catalog_staff()
returns boolean language sql stable set search_path = '' as $$
  select private.has_any_role(array['super_admin', 'store_manager']::public.app_role[]);
$$;
revoke all on function private.is_catalog_staff() from public;
grant execute on function private.is_catalog_staff() to anon, authenticated;

-- Create a profile when someone signs up
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 120),
    left(nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), 20)
  );
  return new;
end $$;
revoke all on function private.handle_new_user() from public;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create policy "Users read own profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = id or (select private.has_any_role(array['super_admin','order_manager','customer_support']::public.app_role[])));
create policy "Users update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Users read own roles" on public.user_roles for select to authenticated
  using ((select auth.uid()) = user_id or (select private.has_any_role(array['super_admin']::public.app_role[])));
create policy "Super admins grant roles" on public.user_roles for insert to authenticated
  with check ((select private.has_any_role(array['super_admin']::public.app_role[])));
create policy "Super admins revoke roles" on public.user_roles for delete to authenticated
  using ((select private.has_any_role(array['super_admin']::public.app_role[])));

grant select, update (full_name, phone) on public.profiles to authenticated;
grant select, insert, delete on public.user_roles to authenticated;

-- Delivery addresses (Nigerian format)
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text check (char_length(label) <= 40),
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text not null check (char_length(phone) between 7 and 20),
  line1 text not null check (char_length(line1) between 3 and 200),
  line2 text check (char_length(line2) <= 200),
  city text not null check (char_length(city) between 2 and 80),
  state text not null check (char_length(state) between 2 and 40),
  landmark text check (char_length(landmark) <= 120),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_id_idx on public.addresses (user_id);
create unique index addresses_one_default_idx on public.addresses (user_id) where is_default;
create trigger addresses_updated_at before update on public.addresses
  for each row execute function private.set_updated_at();
alter table public.addresses enable row level security;
create policy "Users read own addresses" on public.addresses for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add own addresses" on public.addresses for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users edit own addresses" on public.addresses for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete own addresses" on public.addresses for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.addresses to authenticated;

-- Audit log for privileged actions (written by triggers and server functions)
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id);
alter table public.audit_logs enable row level security;
create policy "Super admins read audit log" on public.audit_logs for select to authenticated
  using ((select private.has_any_role(array['super_admin']::public.app_role[])));
grant select on public.audit_logs to authenticated;

create or replace function private.audit_row_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id',
             (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'user_id'),
    case when tg_op = 'UPDATE' then jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new))
         when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;
revoke all on function private.audit_row_change() from public;
create trigger user_roles_audit after insert or delete on public.user_roles
  for each row execute function private.audit_row_change();
