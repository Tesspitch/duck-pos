begin;

create type public.shop_creation_grant_status as enum ('ACTIVE', 'CONSUMED', 'REVOKED');

create table public.platform_admins (
  user_id uuid primary key references public.user_profiles(id) on delete restrict,
  provisioned_by uuid references public.user_profiles(id) on delete set null,
  provisioned_at timestamptz not null default now()
);

comment on table public.platform_admins is
  'System-level administrators. This role is separate from shop OWNER and STAFF membership.';

create table public.shop_creation_grants (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles(id) on delete restrict,
  status public.shop_creation_grant_status not null default 'ACTIVE',
  granted_by uuid not null references public.platform_admins(user_id) on delete restrict,
  granted_at timestamptz not null default now(),
  revoked_by uuid references public.platform_admins(user_id) on delete restrict,
  revoked_at timestamptz,
  consumed_at timestamptz,
  created_shop_id uuid references public.shops(id) on delete restrict,
  updated_at timestamptz not null default now(),
  constraint shop_creation_grants_state_consistent check (
    (status = 'ACTIVE' and revoked_at is null and revoked_by is null and consumed_at is null and created_shop_id is null)
    or
    (status = 'REVOKED' and revoked_at is not null and consumed_at is null and created_shop_id is null)
    or
    (status = 'CONSUMED' and revoked_at is null and revoked_by is null and consumed_at is not null and created_shop_id is not null)
  )
);

create index shop_creation_grants_status_granted_idx
  on public.shop_creation_grants (status, granted_at desc);

create trigger shop_creation_grants_set_updated_at
before update on public.shop_creation_grants
for each row execute function app_private.set_updated_at();

create or replace function app_private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_admins as admin
    where admin.user_id = (select auth.uid())
  );
$$;

create or replace function public.grant_shop_creation(target_user_id uuid)
returns public.shop_creation_grants
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  existing_grant public.shop_creation_grants;
  saved_grant public.shop_creation_grants;
begin
  if actor_id is null or not app_private.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Platform administrator access required.';
  end if;

  if not exists (select 1 from public.user_profiles where id = target_user_id) then
    raise exception using errcode = 'P0002', message = 'Target user must sign in once before receiving a grant.';
  end if;

  if exists (select 1 from public.shops where created_by = target_user_id) then
    raise exception using errcode = '23505', message = 'Target user has already created a shop.';
  end if;

  select * into existing_grant
  from public.shop_creation_grants
  where user_id = target_user_id
  for update;

  if existing_grant.status = 'CONSUMED' then
    raise exception using errcode = '23505', message = 'Shop creation grant has already been consumed.';
  end if;

  if existing_grant.status = 'ACTIVE' then
    return existing_grant;
  end if;

  insert into public.shop_creation_grants (
    user_id,
    status,
    granted_by,
    granted_at,
    revoked_by,
    revoked_at
  )
  values (target_user_id, 'ACTIVE', actor_id, now(), null, null)
  on conflict (user_id) do update
  set status = 'ACTIVE',
      granted_by = actor_id,
      granted_at = now(),
      revoked_by = null,
      revoked_at = null,
      consumed_at = null,
      created_shop_id = null
  returning * into saved_grant;

  insert into public.audit_logs (
    shop_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    null,
    actor_id,
    'SHOP_CREATION_GRANTED',
    'shop_creation_grant',
    saved_grant.id,
    jsonb_build_object('target_user_id', target_user_id)
  );

  return saved_grant;
end;
$$;

create or replace function public.revoke_shop_creation(target_user_id uuid)
returns public.shop_creation_grants
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  saved_grant public.shop_creation_grants;
begin
  if actor_id is null or not app_private.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Platform administrator access required.';
  end if;

  update public.shop_creation_grants
  set status = 'REVOKED',
      revoked_by = actor_id,
      revoked_at = now()
  where user_id = target_user_id
    and status = 'ACTIVE'
  returning * into saved_grant;

  if saved_grant.id is null then
    raise exception using errcode = 'P0002', message = 'Active shop creation grant not found.';
  end if;

  insert into public.audit_logs (
    shop_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    null,
    actor_id,
    'SHOP_CREATION_REVOKED',
    'shop_creation_grant',
    saved_grant.id,
    jsonb_build_object('target_user_id', target_user_id)
  );

  return saved_grant;
end;
$$;

create or replace function public.create_shop_from_grant(
  shop_name text,
  shop_timezone text default 'Asia/Bangkok',
  shop_currency_code text default 'THB'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  active_grant public.shop_creation_grants;
  new_shop_id uuid;
  new_membership_id uuid;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  if exists (select 1 from public.shops where created_by = actor_id) then
    raise exception using errcode = '23505', message = 'This user has already created a shop.';
  end if;

  select * into active_grant
  from public.shop_creation_grants
  where user_id = actor_id
    and status = 'ACTIVE'
  for update;

  if active_grant.id is null then
    raise exception using errcode = '42501', message = 'An active shop creation grant is required.';
  end if;

  insert into public.shops (name, timezone, currency_code, created_by)
  values (btrim(shop_name), btrim(shop_timezone), upper(btrim(shop_currency_code)), actor_id)
  returning id into new_shop_id;

  insert into public.shop_members (shop_id, user_id, role, status, granted_by)
  values (new_shop_id, actor_id, 'OWNER', 'ACTIVE', actor_id)
  returning id into new_membership_id;

  update public.shop_creation_grants
  set status = 'CONSUMED',
      consumed_at = now(),
      created_shop_id = new_shop_id,
      revoked_by = null,
      revoked_at = null
  where id = active_grant.id;

  insert into public.audit_logs (
    shop_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    new_shop_id,
    actor_id,
    'SHOP_CREATED_FROM_GRANT',
    'shop',
    new_shop_id,
    jsonb_build_object(
      'grant_id', active_grant.id,
      'owner_membership_id', new_membership_id
    )
  );

  return new_shop_id;
end;
$$;

create or replace function app_private.provision_first_platform_admin(admin_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.platform_admins) then
    raise exception using errcode = '23505', message = 'Initial platform administrator is already provisioned.';
  end if;

  if not exists (select 1 from public.user_profiles where id = admin_user_id) then
    raise exception using errcode = 'P0002', message = 'Administrator must sign in once before provisioning.';
  end if;

  insert into public.platform_admins (user_id, provisioned_by)
  values (admin_user_id, admin_user_id);

  insert into public.audit_logs (
    shop_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    null,
    admin_user_id,
    'FIRST_PLATFORM_ADMIN_PROVISIONED',
    'platform_admin',
    admin_user_id,
    '{}'::jsonb
  );
end;
$$;

drop function if exists app_private.provision_first_owner(uuid, text, text, text);

alter table public.platform_admins enable row level security;
alter table public.shop_creation_grants enable row level security;

revoke all on table public.platform_admins from anon, authenticated;
revoke all on table public.shop_creation_grants from anon, authenticated;
grant select on table public.platform_admins to authenticated;
grant select on table public.shop_creation_grants to authenticated;

revoke execute on function app_private.is_platform_admin() from public, anon, authenticated;
grant execute on function app_private.is_platform_admin() to authenticated;

revoke execute on function public.grant_shop_creation(uuid) from public, anon;
revoke execute on function public.revoke_shop_creation(uuid) from public, anon;
revoke execute on function public.create_shop_from_grant(text, text, text) from public, anon;
grant execute on function public.grant_shop_creation(uuid) to authenticated;
grant execute on function public.revoke_shop_creation(uuid) to authenticated;
grant execute on function public.create_shop_from_grant(text, text, text) to authenticated;

revoke execute on function app_private.provision_first_platform_admin(uuid)
  from public, anon, authenticated;

create policy platform_admins_select_admin
on public.platform_admins
for select
to authenticated
using ((select app_private.is_platform_admin()));

create policy shop_creation_grants_select_admin_or_self
on public.shop_creation_grants
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select app_private.is_platform_admin())
);

create policy user_profiles_select_platform_admin
on public.user_profiles
for select
to authenticated
using ((select app_private.is_platform_admin()));

create policy audit_logs_select_platform_admin
on public.audit_logs
for select
to authenticated
using ((select app_private.is_platform_admin()));

commit;

