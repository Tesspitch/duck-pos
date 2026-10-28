begin;

create or replace function app_private.protect_own_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) = old.user_id
    and (new.role is distinct from old.role or new.status is distinct from old.status) then
    raise exception using
      errcode = '42501',
      message = 'You cannot change or revoke your own shop membership.';
  end if;

  return new;
end;
$$;

create trigger protect_own_membership
before update on public.shop_members
for each row execute function app_private.protect_own_membership();

revoke execute on function app_private.protect_own_membership()
  from public, anon, authenticated;

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
  actor_is_owner boolean;
  new_shop_id uuid;
  new_membership_id uuid;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  select exists (
    select 1
    from public.shop_members as member
    where member.user_id = actor_id
      and member.role = 'OWNER'
      and member.status = 'ACTIVE'
  ) into actor_is_owner;

  if not actor_is_owner then
    select * into active_grant
    from public.shop_creation_grants
    where user_id = actor_id
      and status = 'ACTIVE'
    for update;

    if active_grant.id is null then
      raise exception using errcode = '42501', message = 'An active shop creation grant is required for the first shop.';
    end if;
  end if;

  insert into public.shops (name, timezone, currency_code, created_by)
  values (btrim(shop_name), btrim(shop_timezone), upper(btrim(shop_currency_code)), actor_id)
  returning id into new_shop_id;

  insert into public.shop_members (shop_id, user_id, role, status, granted_by)
  values (new_shop_id, actor_id, 'OWNER', 'ACTIVE', actor_id)
  returning id into new_membership_id;

  if active_grant.id is not null then
    update public.shop_creation_grants
    set status = 'CONSUMED',
        consumed_at = now(),
        created_shop_id = new_shop_id,
        revoked_by = null,
        revoked_at = null
    where id = active_grant.id;
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
    new_shop_id,
    actor_id,
    case when active_grant.id is null then 'ADDITIONAL_SHOP_CREATED' else 'SHOP_CREATED_FROM_GRANT' end,
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

commit;
