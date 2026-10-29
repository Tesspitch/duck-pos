begin;

create type public.store_event_type as enum ('OPENED', 'CLOSED');

create table public.store_events (
  id bigint generated always as identity primary key,
  shop_id uuid not null references public.shops(id) on delete restrict,
  store_session_id uuid not null references public.store_sessions(id) on delete restrict,
  event_type public.store_event_type not null,
  actor_user_id uuid not null references public.user_profiles(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index store_events_shop_created_idx on public.store_events (shop_id, created_at desc, id desc);
create index store_events_session_created_idx on public.store_events (store_session_id, created_at, id);

alter table public.store_events enable row level security;
revoke all on table public.store_events from anon, authenticated;
revoke all on sequence public.store_events_id_seq from anon, authenticated;
grant select on table public.store_events to authenticated;

create policy store_events_select_member on public.store_events
for select to authenticated
using ((select app_private.is_active_shop_member(shop_id)));

create or replace function public.get_store_management(target_shop_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  active_session public.store_sessions;
  history_json jsonb;
begin
  if not app_private.is_active_shop_member(target_shop_id) then
    raise exception using errcode = '42501', message = 'Active shop membership is required.';
  end if;

  select * into active_session
  from public.store_sessions
  where shop_id = target_shop_id and status = 'OPEN'
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', session.id,
    'businessDate', session.business_date,
    'status', session.status,
    'openedAt', session.opened_at,
    'closedAt', session.closed_at,
    'openedBy', opener.display_name,
    'closedBy', closer.display_name,
    'orderCount', (select count(*) from public.orders where store_session_id = session.id),
    'completedOrderCount', (select count(*) from public.orders where store_session_id = session.id and status = 'COMPLETED'),
    'collectedSatang', coalesce((
      select sum(payment.paid_amount_satang)
      from public.payments as payment
      join public.orders as paid_order on paid_order.id = payment.order_id
      where paid_order.store_session_id = session.id and payment.status = 'PAID'
    ), 0)
  ) order by session.opened_at desc), '[]'::jsonb)
  into history_json
  from (
    select * from public.store_sessions
    where shop_id = target_shop_id
    order by opened_at desc
    limit 20
  ) as session
  left join public.user_profiles as opener on opener.id = session.opened_by
  left join public.user_profiles as closer on closer.id = session.closed_by;

  return jsonb_build_object(
    'isOpen', active_session.id is not null,
    'activeSession', case when active_session.id is null then null else jsonb_build_object(
      'id', active_session.id,
      'businessDate', active_session.business_date,
      'openedAt', active_session.opened_at,
      'pendingOrderCount', (
        select count(*) from public.orders
        where store_session_id = active_session.id and status in ('QUEUED', 'PREPARING', 'READY')
      )
    ) end,
    'history', history_json
  );
end;
$$;

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
  if not app_private.is_active_shop_member(target_shop_id, array['OWNER']::public.shop_role[]) then
    raise exception using errcode = '42501', message = 'Only an active shop owner can open the store.';
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

create or replace function public.close_store_session(
  target_shop_id uuid,
  expected_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_session public.store_sessions;
  pending_count integer;
  order_count integer;
  collected_total bigint;
begin
  if not app_private.is_active_shop_member(target_shop_id, array['OWNER']::public.shop_role[]) then
    raise exception using errcode = '42501', message = 'Only an active shop owner can close the store.';
  end if;

  perform 1 from public.shops where id = target_shop_id for update;
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

  select count(*) into pending_count
  from public.orders
  where store_session_id = active_session.id and status in ('QUEUED', 'PREPARING', 'READY');
  if pending_count > 0 then
    raise exception using errcode = 'P0001', message = 'Pending orders must be completed or cancelled before closing the store.';
  end if;

  select count(*) into order_count from public.orders where store_session_id = active_session.id;
  select coalesce(sum(payment.paid_amount_satang), 0) into collected_total
  from public.payments as payment
  join public.orders as paid_order on paid_order.id = payment.order_id
  where paid_order.store_session_id = active_session.id and payment.status = 'PAID';

  update public.store_sessions
  set status = 'CLOSED', closed_at = now(), closed_by = auth.uid()
  where id = active_session.id;

  insert into public.store_events (shop_id, store_session_id, event_type, actor_user_id, metadata)
  values (target_shop_id, active_session.id, 'CLOSED', auth.uid(),
    jsonb_build_object('orderCount', order_count, 'collectedSatang', collected_total));
  insert into public.audit_logs (shop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_shop_id, auth.uid(), 'STORE_CLOSED', 'store_session', active_session.id,
    jsonb_build_object('orderCount', order_count, 'collectedSatang', collected_total));

  return jsonb_build_object(
    'id', active_session.id,
    'closedAt', now(),
    'orderCount', order_count,
    'collectedSatang', collected_total
  );
end;
$$;

revoke execute on function public.get_store_management(uuid) from public, anon;
revoke execute on function public.open_store_session(uuid) from public, anon;
revoke execute on function public.close_store_session(uuid, uuid) from public, anon;
grant execute on function public.get_store_management(uuid) to authenticated;
grant execute on function public.open_store_session(uuid) to authenticated;
grant execute on function public.close_store_session(uuid, uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'store_sessions'
  ) then
    alter publication supabase_realtime add table public.store_sessions;
  end if;
end;
$$;

commit;

