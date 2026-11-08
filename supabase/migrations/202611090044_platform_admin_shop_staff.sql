begin;

create function public.list_platform_shop_staff(target_shop_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not app_private.is_platform_admin() then
    raise exception using errcode='42501', message='Platform administrator access required.';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'userId', m.user_id, 'name', p.display_name, 'email', p.email
  ) order by p.display_name, m.user_id)
  from public.shop_members m
  join public.shops s on s.id=m.shop_id and s.deleted_at is null
  join public.user_profiles p on p.id=m.user_id
  where m.shop_id=target_shop_id and m.role='STAFF' and m.status='ACTIVE'), '[]'::jsonb);
end $$;

create function public.set_platform_shop_staff(target_shop_id uuid, target_user_id uuid, active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  member_id uuid;
begin
  if actor_id is null or not app_private.is_platform_admin() then
    raise exception using errcode='42501', message='Platform administrator access required.';
  end if;
  if active is null or (not active and target_user_id=actor_id) then
    raise exception using errcode='22023', message='Invalid staff change.';
  end if;
  perform 1 from public.shops where id=target_shop_id and deleted_at is null for share;
  if not found then raise exception using errcode='P0002', message='Shop not found.'; end if;

  if active then
    if not exists(select 1 from public.user_profiles where id=target_user_id) then
      raise exception using errcode='P0002', message='Target user does not exist.';
    end if;
    insert into public.shop_members as m (shop_id, user_id, role, status, granted_by)
    values (target_shop_id, target_user_id, 'STAFF', 'ACTIVE', actor_id)
    on conflict (shop_id, user_id) do update set status='ACTIVE', granted_by=actor_id,
      granted_at=now(), revoked_by=null, revoked_at=null
    where m.role='STAFF' and m.status='REVOKED'
    returning id into member_id;
    if not found then raise exception using errcode='23505', message='User already has shop access or is an owner.'; end if;
  else
    update public.shop_members set status='REVOKED', revoked_by=actor_id, revoked_at=now()
    where shop_id=target_shop_id and user_id=target_user_id and role='STAFF' and status='ACTIVE'
    returning id into member_id;
    if not found then raise exception using errcode='P0002', message='Active staff membership not found.'; end if;
  end if;

  insert into public.audit_logs (shop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_shop_id, actor_id, case when active then 'SHOP_MEMBER_GRANTED' else 'SHOP_MEMBER_REVOKED' end,
    'shop_member', member_id, jsonb_build_object('target_user_id',target_user_id,'role','STAFF','source','platform_admin'));
end $$;

revoke all on function public.list_platform_shop_staff(uuid), public.set_platform_shop_staff(uuid,uuid,boolean) from public,anon;
grant execute on function public.list_platform_shop_staff(uuid), public.set_platform_shop_staff(uuid,uuid,boolean) to authenticated;
commit;
