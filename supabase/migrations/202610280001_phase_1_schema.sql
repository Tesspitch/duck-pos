begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create type public.shop_role as enum ('OWNER', 'STAFF');
create type public.membership_status as enum ('ACTIVE', 'REVOKED');

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_profiles is
  'Application-safe profile fields mirrored from Supabase Auth. Authorization is never stored here.';

create table public.shops (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  timezone text not null default 'Asia/Bangkok'
    check (char_length(btrim(timezone)) between 1 and 64),
  currency_code text not null default 'THB'
    check (currency_code ~ '^[A-Z]{3}$'),
  created_by uuid not null references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.shops.timezone is
  'Provisional Phase 1 default; must be confirmed before store-session business-date logic.';
comment on column public.shops.currency_code is
  'Provisional Phase 1 default; monetary values in later phases use integer minor units.';

create table public.shop_members (
  id uuid primary key default extensions.gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  user_id uuid not null references public.user_profiles(id) on delete restrict,
  role public.shop_role not null,
  status public.membership_status not null default 'ACTIVE',
  granted_by uuid references public.user_profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_by uuid references public.user_profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_members_shop_user_unique unique (shop_id, user_id),
  constraint shop_members_revocation_consistent check (
    (status = 'ACTIVE' and revoked_at is null and revoked_by is null)
    or
    (status = 'REVOKED' and revoked_at is not null)
  )
);

create index shop_members_user_active_idx
  on public.shop_members (user_id, shop_id)
  where status = 'ACTIVE';
create index shop_members_shop_role_active_idx
  on public.shop_members (shop_id, role, user_id)
  where status = 'ACTIVE';

create table public.shop_locations (
  id uuid primary key default extensions.gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  geofence_radius_m integer not null default 100 check (geofence_radius_m = 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_locations_one_per_shop unique (shop_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  shop_id uuid references public.shops(id) on delete restrict,
  actor_user_id uuid references public.user_profiles(id) on delete set null,
  action text not null check (char_length(btrim(action)) between 1 and 100),
  entity_type text not null check (char_length(btrim(entity_type)) between 1 and 80),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index audit_logs_shop_created_idx
  on public.audit_logs (shop_id, created_at desc, id desc);
create index audit_logs_actor_created_idx
  on public.audit_logs (actor_user_id, created_at desc)
  where actor_user_id is not null;

commit;
