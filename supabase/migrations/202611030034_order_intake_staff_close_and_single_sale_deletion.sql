begin;

-- A sales session can stay open while the shop stops accepting new orders and
-- finishes the existing queue. Closing the session remains a separate action.
alter table public.store_sessions
  add column accepting_orders boolean not null default true;

create or replace function app_private.reject_order_when_intake_paused()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.store_sessions session
    where session.id = new.store_session_id
      and session.shop_id = new.shop_id
      and session.status = 'OPEN'
      and not session.accepting_orders
  ) then
    raise exception using errcode = 'P0001', message = 'The shop is not accepting new orders.';
  end if;
  return new;
end;
$$;
revoke all on function app_private.reject_order_when_intake_paused() from public, anon, authenticated;

create trigger orders_require_accepting_session
before insert on public.orders
for each row execute function app_private.reject_order_when_intake_paused();

create function public.set_store_order_acceptance(
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
  if not app_private.is_active_shop_member(target_shop_id, array['OWNER', 'STAFF']::public.shop_role[]) then
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
  if not app_private.is_active_shop_member(target_shop_id, array['OWNER', 'STAFF']::public.shop_role[]) then
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

-- Extend the management response without changing its established contract.
create or replace function public.get_store_management(target_shop_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare active_session public.store_sessions; history_json jsonb;
begin
  if not app_private.is_active_shop_member(target_shop_id) then
    raise exception using errcode = '42501', message = 'Active shop membership is required.';
  end if;
  select * into active_session from public.store_sessions
    where shop_id = target_shop_id and status = 'OPEN' limit 1;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', session.id, 'businessDate', session.business_date, 'status', session.status,
    'openedAt', session.opened_at, 'closedAt', session.closed_at,
    'openedBy', opener.display_name, 'closedBy', closer.display_name,
    'orderCount', (select count(*) from public.orders where store_session_id = session.id),
    'completedOrderCount', (select count(*) from public.orders where store_session_id = session.id and status = 'COMPLETED'),
    'collectedSatang', coalesce((select sum(payment.paid_amount_satang)
      from public.payments payment join public.orders paid_order on paid_order.id = payment.order_id
      where paid_order.store_session_id = session.id and payment.status = 'PAID'), 0)
  ) order by session.opened_at desc), '[]'::jsonb) into history_json
  from (select * from public.store_sessions where shop_id = target_shop_id order by opened_at desc limit 20) session
  left join public.user_profiles opener on opener.id = session.opened_by
  left join public.user_profiles closer on closer.id = session.closed_by;

  return jsonb_build_object(
    'isOpen', active_session.id is not null,
    'acceptingOrders', coalesce(active_session.accepting_orders, false),
    'activeSession', case when active_session.id is null then null else jsonb_build_object(
      'id', active_session.id, 'businessDate', active_session.business_date,
      'openedAt', active_session.opened_at, 'acceptingOrders', active_session.accepting_orders,
      'pendingOrderCount', (select count(*) from public.orders where store_session_id = active_session.id
        and (status in ('QUEUED','PREPARING','READY') or (status <> 'CANCELLED' and payment_status = 'UNPAID')))
    ) end,
    'history', history_json
  );
end;
$$;

-- Wrap the existing menu/catalog payloads so intake pause is reflected in both
-- customer and staff clients without duplicating their large catalog queries.
alter function public.get_public_menu(uuid) rename to get_public_menu_catalog;
create function public.get_public_menu(target_shop_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_set(
    public.get_public_menu_catalog(target_shop_id), '{isOpen}',
    to_jsonb(exists(select 1 from public.store_sessions where shop_id=target_shop_id and status='OPEN' and accepting_orders))
  );
$$;
revoke execute on function public.get_public_menu(uuid) from public;
grant execute on function public.get_public_menu(uuid) to anon, authenticated;

alter function public.list_active_staff_orders(uuid) rename to list_active_staff_orders_core;
create function public.list_active_staff_orders(target_shop_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_set(
    public.list_active_staff_orders_core(target_shop_id), '{isOpen}',
    to_jsonb(exists(select 1 from public.store_sessions where shop_id=target_shop_id and status='OPEN' and accepting_orders))
  );
$$;
revoke execute on function public.list_active_staff_orders(uuid) from public, anon;
grant execute on function public.list_active_staff_orders(uuid) to authenticated;

-- Owner-only deletion of one terminal order. This uses the same tombstone and
-- child-row erasure rules as date-range deletion, but never touches the session
-- or daily queue counter.
create function public.preview_shop_order_deletion(target_shop_id uuid, target_order_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare target public.orders; fingerprint text; collected bigint; blocked text;
begin
  perform app_private.require_sales_owner(target_shop_id);
  select * into target from public.orders where id=target_order_id and shop_id=target_shop_id;
  if target.id is null then raise exception using errcode='P0002',message='Order not found.'; end if;
  select encode(extensions.digest(target.id::text||target.updated_at::text||coalesce(p.updated_at::text,''),'sha256'),'hex'),
    coalesce(p.paid_amount_satang,0)
  into fingerprint,collected from (select 1) seed left join public.payments p on p.order_id=target.id;
  if target.status in ('QUEUED','PREPARING','READY') or (target.status<>'CANCELLED' and target.payment_status='UNPAID') then
    blocked:='RESOLVE_ORDER_FIRST';
  end if;
  return jsonb_build_object('count',1,'grossSatang',case when target.status='CANCELLED' then 0 else target.total_satang end,
    'collectedSatang',collected,'fingerprint',fingerprint,'blockedReason',blocked,
    'orderReference',target.order_reference,'queueNumber',target.queue_number);
end;
$$;

create function public.delete_shop_order_history(
  target_shop_id uuid, target_order_id uuid, expected_fingerprint text, confirmation_name text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare preview jsonb; shop_name text; target public.orders;
begin
  perform app_private.require_sales_owner(target_shop_id);
  select name into shop_name from public.shops where id=target_shop_id and deleted_at is null for update;
  if confirmation_name is distinct from shop_name or shop_name is null then
    raise exception using errcode='22023',message='Shop name confirmation does not match.';
  end if;
  select * into target from public.orders where id=target_order_id and shop_id=target_shop_id for update;
  if target.id is null then raise exception using errcode='P0002',message='Order not found.'; end if;
  perform 1 from public.payments where order_id=target.id for update;
  preview:=public.preview_shop_order_deletion(target_shop_id,target_order_id);
  if preview->>'blockedReason' is not null then raise exception using errcode='P0001',message=preview->>'blockedReason'; end if;
  if expected_fingerprint is distinct from preview->>'fingerprint' then
    raise exception using errcode='40001',message='History changed. Preview again before deleting.';
  end if;
  insert into app_private.deleted_order_receipts(shop_id,idempotency_key) values(target.shop_id,target.idempotency_key) on conflict do nothing;
  delete from public.order_item_options opt using public.order_items item where opt.order_item_id=item.id and item.order_id=target.id;
  delete from public.order_items where order_id=target.id;
  delete from public.order_events where order_id=target.id;
  delete from public.payments where order_id=target.id;
  delete from public.orders where id=target.id;
  insert into public.audit_logs(shop_id,actor_user_id,action,entity_type,entity_id,metadata)
    values(target_shop_id,auth.uid(),'SALES_ORDER_HISTORY_DELETED','order',target_order_id,
      jsonb_build_object('orderReference',target.order_reference,'businessDate',target.business_date));
  return preview;
end;
$$;
revoke execute on function public.preview_shop_order_deletion(uuid,uuid), public.delete_shop_order_history(uuid,uuid,text,text) from public,anon;
grant execute on function public.preview_shop_order_deletion(uuid,uuid), public.delete_shop_order_history(uuid,uuid,text,text) to authenticated;

commit;
