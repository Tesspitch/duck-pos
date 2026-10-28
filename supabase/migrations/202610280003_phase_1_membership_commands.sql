begin;

create or replace function public.grant_shop_member(
  target_shop_id uuid,
  target_user_id uuid,
  target_role public.shop_role
)
returns public.shop_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  previous_member public.shop_members;
  saved_member public.shop_members;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  if not app_private.is_active_shop_member(target_shop_id, array['OWNER']::public.shop_role[]) then
    raise exception using errcode = '42501', message = 'Only an active shop owner can grant membership.';
  end if;

  if not exists (select 1 from public.user_profiles where id = target_user_id) then
    raise exception using errcode = 'P0002', message = 'Target user does not exist.';
  end if;

  select * into previous_member
  from public.shop_members
  where shop_id = target_shop_id and user_id = target_user_id;

  insert into public.shop_members (
    shop_id,
    user_id,
    role,
    status,
    granted_by,
    granted_at,
    revoked_by,
    revoked_at
  )
  values (
    target_shop_id,
    target_user_id,
    target_role,
    'ACTIVE',
    actor_id,
    now(),
    null,
    null
  )
  on conflict (shop_id, user_id) do update
  set role = excluded.role,
      status = 'ACTIVE',
      granted_by = actor_id,
      granted_at = now(),
      revoked_by = null,
      revoked_at = null
  returning * into saved_member;

  insert into public.audit_logs (
    shop_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_shop_id,
    actor_id,
    case when previous_member.id is null then 'SHOP_MEMBER_GRANTED' else 'SHOP_MEMBER_UPDATED' end,
    'shop_member',
    saved_member.id,
    jsonb_build_object(
      'target_user_id', target_user_id,
      'new_role', target_role,
      'previous_role', previous_member.role,
      'previous_status', previous_member.status
    )
  );

  return saved_member;
end;
$$;

create or replace function public.revoke_shop_member(
  target_shop_id uuid,
  target_user_id uuid
)
returns public.shop_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  saved_member public.shop_members;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  if not app_private.is_active_shop_member(target_shop_id, array['OWNER']::public.shop_role[]) then
    raise exception using errcode = '42501', message = 'Only an active shop owner can revoke membership.';
  end if;

  update public.shop_members
  set status = 'REVOKED',
      revoked_by = actor_id,
      revoked_at = now()
  where shop_id = target_shop_id
    and user_id = target_user_id
    and status = 'ACTIVE'
  returning * into saved_member;

  if saved_member.id is null then
    raise exception using errcode = 'P0002', message = 'Active membership not found.';
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
    target_shop_id,
    actor_id,
    'SHOP_MEMBER_REVOKED',
    'shop_member',
    saved_member.id,
    jsonb_build_object('target_user_id', target_user_id, 'previous_role', saved_member.role)
  );

  return saved_member;
end;
$$;

create or replace function app_private.provision_first_owner(
  owner_user_id uuid,
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
  new_shop_id uuid;
  new_member_id uuid;
begin
  if exists (select 1 from public.shops) then
    raise exception using
      errcode = '23505',
      message = 'Initial owner provisioning is complete; use owner-managed membership instead.';
  end if;

  if not exists (select 1 from public.user_profiles where id = owner_user_id) then
    raise exception using
      errcode = 'P0002',
      message = 'Owner must sign in with Google once before provisioning.';
  end if;

  insert into public.shops (name, timezone, currency_code, created_by)
  values (btrim(shop_name), btrim(shop_timezone), upper(btrim(shop_currency_code)), owner_user_id)
  returning id into new_shop_id;

  insert into public.shop_members (shop_id, user_id, role, status, granted_by)
  values (new_shop_id, owner_user_id, 'OWNER', 'ACTIVE', owner_user_id)
  returning id into new_member_id;

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
    owner_user_id,
    'FIRST_OWNER_PROVISIONED',
    'shop_member',
    new_member_id,
    jsonb_build_object('shop_name', btrim(shop_name))
  );

  return new_shop_id;
end;
$$;

commit;
