begin;
-- Platform administrators may operate sessions without acquiring shop membership.
-- Existing locking, pending-order checks, table guards, events and audit remain in place.
create or replace function public.set_store_order_acceptance(
  target_shop_id uuid,
  expected_session_id uuid,
  accept_new_orders boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare active_session public.store_sessions;
begin
  if not app_private.is_active_shop_member(target_shop_id, array['OWNER', 'STAFF']::public.shop_role[]) and not (app_private.is_platform_admin() and accept_new_orders is false) then
    raise exception using errcode = '42501', message = 'Active owner or staff membership is required.';
  end if;

  perform 1 from public.shops where id = target_shop_id and deleted_at is null for update;
  select * into active_session
  from public.store_sessions
  where shop_id = target_shop_id and status = 'OPEN'
  for update;

  if active_session.id is null then
    raise exception using errcode = 'P0001', message = 'The store is closed.';
  end if;
  if active_session.id <> expected_session_id then
    raise exception using errcode = '40001', message = 'The active store session changed on another device.';
  end if;

  update public.store_sessions
  set accepting_orders = accept_new_orders
  where id = active_session.id;

  insert into public.audit_logs(shop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    target_shop_id, auth.uid(),
    case when accept_new_orders then 'ORDER_INTAKE_RESUMED' else 'ORDER_INTAKE_PAUSED' end,
    'store_session', active_session.id, '{}'
  );

  return jsonb_build_object(
    'id', active_session.id,
    'acceptingOrders', accept_new_orders
  );
end;
$$;
revoke execute on function public.set_store_order_acceptance(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_store_order_acceptance(uuid, uuid, boolean) to authenticated;

-- STAFF may close a settled session. Pending food or unpaid non-cancelled
-- orders still block closure for both roles.
create or replace function public.close_store_session(target_shop_id uuid, expected_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_session public.store_sessions;
  unresolved_count integer;
  order_count integer;
  collected_total bigint;
begin
  if not app_private.is_active_shop_member(target_shop_id, array['OWNER', 'STAFF']::public.shop_role[]) and not app_private.is_platform_admin() then
    raise exception using errcode = '42501', message = 'Active owner or staff membership is required to close the store.';
  end if;

  perform 1 from public.shops where id = target_shop_id and deleted_at is null for update;
  select * into active_session
  from public.store_sessions
  where shop_id = target_shop_id and status = 'OPEN'
  for update;

  if active_session.id is null then
    raise exception using errcode = 'P0001', message = 'The store is already closed.';
  end if;
  if active_session.id <> expected_session_id then
    raise exception using errcode = '40001', message = 'The active store session changed on another device.';
  end if;

  select count(*) into unresolved_count
  from public.orders
  where store_session_id = active_session.id
    and (status in ('QUEUED', 'PREPARING', 'READY')
      or (status <> 'CANCELLED' and payment_status = 'UNPAID'));
  if unresolved_count > 0 then
    raise exception using errcode = 'P0001', message = 'Pending or unpaid orders must be resolved before closing the store.';
  end if;

  select count(*) into order_count from public.orders where store_session_id = active_session.id;
  select coalesce(sum(payment.paid_amount_satang), 0) into collected_total
  from public.payments payment
  join public.orders paid_order on paid_order.id = payment.order_id
  where paid_order.store_session_id = active_session.id and payment.status = 'PAID';

  update public.store_sessions
  set status = 'CLOSED', accepting_orders = false, closed_at = now(), closed_by = auth.uid()
  where id = active_session.id;

  insert into public.store_events(shop_id, store_session_id, event_type, actor_user_id, metadata)
  values (target_shop_id, active_session.id, 'CLOSED', auth.uid(),
    jsonb_build_object('orderCount', order_count, 'collectedSatang', collected_total));
  insert into public.audit_logs(shop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_shop_id, auth.uid(), 'STORE_CLOSED', 'store_session', active_session.id,
    jsonb_build_object('orderCount', order_count, 'collectedSatang', collected_total));

  return jsonb_build_object('id', active_session.id, 'closedAt', now(),
    'orderCount', order_count, 'collectedSatang', collected_total);
end;
$$;
revoke execute on function public.close_store_session(uuid, uuid) from public, anon;
grant execute on function public.close_store_session(uuid, uuid) to authenticated;


create or replace function public.list_platform_shops(search_text text default '', page_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not app_private.is_platform_admin() then raise exception using errcode='42501',message='Platform administrator access required.'; end if;
 if page_offset is null or page_offset<0 or char_length(coalesce(search_text,''))>120 then raise exception using errcode='22023',message='Invalid shop search.'; end if;
 with matches as (
  select id,name,created_at from public.shops
  where deleted_at is null and (coalesce(search_text,'')='' or strpos(lower(name),lower(search_text))>0 or id::text=search_text)
  order by created_at desc,id offset page_offset limit 21
 ), page as (select * from matches order by created_at desc,id limit 20)
 select jsonb_build_object('shops',coalesce((select jsonb_agg(jsonb_build_object(
  'id',p.id,'name',p.name,'isOpen',s.id is not null,'acceptingOrders',coalesce(s.accepting_orders,false),'activeSessionId',s.id)
  order by p.created_at desc,p.id) from page p left join public.store_sessions s on s.shop_id=p.id and s.status='OPEN'),'[]'::jsonb),
  'hasMore',(select count(*)>20 from matches)) into result;
 return result;
end $$;
revoke all on function public.list_platform_shops(text,integer) from public,anon;
grant execute on function public.list_platform_shops(text,integer) to authenticated;
commit;

