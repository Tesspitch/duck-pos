begin;

create or replace function public.open_store_session(target_shop_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_shop public.shops;
  new_session public.store_sessions;
begin
  if not app_private.is_active_shop_member(target_shop_id, array['OWNER', 'STAFF']::public.shop_role[]) then
    raise exception using errcode = '42501', message = 'Active owner or staff membership is required to open the store.';
  end if;

  select * into target_shop from public.shops where id = target_shop_id for update;
  if target_shop.id is null then
    raise exception using errcode = 'P0002', message = 'Shop not found.';
  end if;
  if exists (select 1 from public.store_sessions where shop_id = target_shop_id and status = 'OPEN') then
    raise exception using errcode = '23505', message = 'The store already has an open session.';
  end if;

  insert into public.store_sessions (shop_id, business_date, opened_by)
  values (target_shop_id, timezone(target_shop.timezone, now())::date, auth.uid())
  returning * into new_session;

  insert into public.store_events (shop_id, store_session_id, event_type, actor_user_id, metadata)
  values (target_shop_id, new_session.id, 'OPENED', auth.uid(),
    jsonb_build_object('businessDate', new_session.business_date));
  insert into public.audit_logs (shop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_shop_id, auth.uid(), 'STORE_OPENED', 'store_session', new_session.id,
    jsonb_build_object('businessDate', new_session.business_date));

  return jsonb_build_object(
    'id', new_session.id,
    'businessDate', new_session.business_date,
    'openedAt', new_session.opened_at
  );
end;
$$;

revoke execute on function public.open_store_session(uuid) from public, anon;
grant execute on function public.open_store_session(uuid) to authenticated;

commit;
