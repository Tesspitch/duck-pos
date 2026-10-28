begin;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function app_private.set_updated_at();

create trigger shops_set_updated_at
before update on public.shops
for each row execute function app_private.set_updated_at();

create trigger shop_members_set_updated_at
before update on public.shop_members
for each row execute function app_private.set_updated_at();

create trigger shop_locations_set_updated_at
before update on public.shop_locations
for each row execute function app_private.set_updated_at();

create or replace function app_private.sync_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(excluded.display_name, public.user_profiles.display_name),
      avatar_url = coalesce(excluded.avatar_url, public.user_profiles.avatar_url),
      updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_changed
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function app_private.sync_user_profile();

insert into public.user_profiles (id, email, display_name, avatar_url)
select
  users.id,
  users.email,
  coalesce(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name'),
  coalesce(users.raw_user_meta_data ->> 'avatar_url', users.raw_user_meta_data ->> 'picture')
from auth.users as users
on conflict (id) do nothing;

create or replace function app_private.is_active_shop_member(
  target_shop_id uuid,
  allowed_roles public.shop_role[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.shop_members as member
    where member.shop_id = target_shop_id
      and member.user_id = (select auth.uid())
      and member.status = 'ACTIVE'
      and (allowed_roles is null or member.role = any(allowed_roles))
  );
$$;

create or replace function app_private.can_view_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target_user_id = (select auth.uid())
    or exists (
      select 1
      from public.shop_members as owner_membership
      join public.shop_members as target_membership
        on target_membership.shop_id = owner_membership.shop_id
      where owner_membership.user_id = (select auth.uid())
        and owner_membership.role = 'OWNER'
        and owner_membership.status = 'ACTIVE'
        and target_membership.user_id = target_user_id
    );
$$;

create or replace function app_private.protect_last_active_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  removes_active_owner boolean;
  remaining_owner_count integer;
begin
  removes_active_owner := old.role = 'OWNER' and old.status = 'ACTIVE'
    and (
      tg_op = 'DELETE'
      or new.role <> 'OWNER'
      or new.status <> 'ACTIVE'
      or new.shop_id <> old.shop_id
    );

  if not removes_active_owner then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select count(*)
  into remaining_owner_count
  from public.shop_members as member
  where member.shop_id = old.shop_id
    and member.id <> old.id
    and member.role = 'OWNER'
    and member.status = 'ACTIVE';

  if remaining_owner_count = 0 then
    raise exception using
      errcode = '23514',
      message = 'A shop must retain at least one active owner.';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger protect_last_active_owner
before update or delete on public.shop_members
for each row execute function app_private.protect_last_active_owner();

create or replace function app_private.audit_shop_location_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_shop_id uuid;
  affected_id uuid;
begin
  affected_shop_id := case when tg_op = 'DELETE' then old.shop_id else new.shop_id end;
  affected_id := case when tg_op = 'DELETE' then old.id else new.id end;

  insert into public.audit_logs (
    shop_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    affected_shop_id,
    (select auth.uid()),
    'SHOP_LOCATION_' || tg_op,
    'shop_location',
    affected_id,
    jsonb_build_object('operation', tg_op)
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger audit_shop_location_change
after insert or update or delete on public.shop_locations
for each row execute function app_private.audit_shop_location_change();

commit;
