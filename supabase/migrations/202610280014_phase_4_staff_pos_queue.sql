begin;

create type public.payment_method as enum ('CASH', 'BANK_TRANSFER');

create table public.payments (
  id uuid primary key default extensions.gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  status public.payment_status not null default 'PAID' check (status in ('PAID', 'REFUNDED')),
  method public.payment_method not null,
  paid_amount_satang integer not null check (paid_amount_satang > 0),
  amount_received_satang integer not null check (amount_received_satang > 0),
  change_satang integer not null default 0 check (change_satang >= 0),
  confirmed_by uuid not null references public.user_profiles(id) on delete restrict,
  paid_at timestamptz not null default now(),
  refunded_by uuid references public.user_profiles(id) on delete restrict,
  refunded_at timestamptz,
  refund_reason text check (refund_reason is null or char_length(btrim(refund_reason)) between 3 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_order_unique unique (order_id),
  constraint payments_shop_order_unique unique (shop_id, order_id),
  constraint payments_refund_consistent check (
    (status = 'PAID' and refunded_by is null and refunded_at is null and refund_reason is null)
    or (status = 'REFUNDED' and refunded_at is not null and refund_reason is not null)
  )
);

create index payments_shop_paid_at_idx on public.payments (shop_id, paid_at desc);

create trigger payments_set_updated_at
before update on public.payments
for each row execute function app_private.set_updated_at();

alter table public.payments enable row level security;
revoke all on table public.payments from anon, authenticated;
grant select on table public.payments to authenticated;

create policy payments_select_member on public.payments
for select to authenticated
using ((select app_private.is_active_shop_member(shop_id)));

create or replace function public.create_pos_order(
  target_shop_id uuid,
  request_idempotency_key uuid,
  cart_items jsonb,
  order_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_session public.store_sessions;
  existing_order public.orders;
  product_row public.products;
  cart_item jsonb;
  option_group_row public.option_groups;
  selected_option_ids uuid[];
  selected_count integer;
  item_quantity integer;
  item_note text;
  unit_price integer;
  subtotal integer := 0;
  queue_value integer;
  new_order public.orders;
  new_item_id uuid;
begin
  if not app_private.is_active_shop_member(target_shop_id) then
    raise exception using errcode = '42501', message = 'Active shop membership is required.';
  end if;

  if cart_items is null or jsonb_typeof(cart_items) <> 'array'
    or jsonb_array_length(cart_items) not between 1 and 30 then
    raise exception using errcode = '22023', message = 'Cart must contain 1 to 30 lines.';
  end if;

  if order_note is null or char_length(order_note) > 500 then
    raise exception using errcode = '22023', message = 'Order note is too long.';
  end if;

  select * into existing_order
  from public.orders
  where shop_id = target_shop_id and idempotency_key = request_idempotency_key;

  if existing_order.id is not null then
    return jsonb_build_object(
      'orderId', existing_order.id,
      'queueNumber', existing_order.queue_number,
      'orderReference', existing_order.order_reference,
      'status', existing_order.status,
      'totalSatang', existing_order.total_satang
    );
  end if;

  select * into active_session
  from public.store_sessions
  where shop_id = target_shop_id and status = 'OPEN'
  for share;

  if active_session.id is null then
    raise exception using errcode = 'P0001', message = 'Shop is closed.';
  end if;

  for cart_item in select value from jsonb_array_elements(cart_items)
  loop
    item_quantity := (cart_item ->> 'quantity')::integer;
    item_note := coalesce(cart_item ->> 'note', '');
    if item_quantity not between 1 and 20 or char_length(item_note) > 300 then
      raise exception using errcode = '22023', message = 'Invalid quantity or item note.';
    end if;

    select * into product_row
    from public.products
    where id = (cart_item ->> 'productId')::uuid
      and shop_id = target_shop_id and is_visible and is_available;

    if product_row.id is null then
      raise exception using errcode = 'P0002', message = 'A product is unavailable.';
    end if;

    select coalesce(array_agg(distinct value::uuid), array[]::uuid[])
    into selected_option_ids
    from jsonb_array_elements_text(coalesce(cart_item -> 'optionIds', '[]'::jsonb));

    for option_group_row in
      select * from public.option_groups
      where shop_id = target_shop_id and product_id = product_row.id and is_visible
    loop
      select count(*) into selected_count
      from public.product_options
      where id = any(selected_option_ids)
        and option_group_id = option_group_row.id
        and shop_id = target_shop_id and is_visible and is_available;

      if selected_count < option_group_row.min_select or selected_count > option_group_row.max_select then
        raise exception using errcode = '22023', message = 'Product option selection is invalid.';
      end if;
    end loop;

    if exists (
      select 1 from unnest(selected_option_ids) as selected_id
      where not exists (
        select 1 from public.product_options as selected_option
        join public.option_groups as selected_group on selected_group.id = selected_option.option_group_id
        where selected_option.id = selected_id
          and selected_option.shop_id = target_shop_id
          and selected_option.is_visible and selected_option.is_available
          and selected_group.product_id = product_row.id and selected_group.is_visible
      )
    ) then
      raise exception using errcode = '22023', message = 'A selected option is invalid or unavailable.';
    end if;

    select product_row.base_price_satang + coalesce(sum(price_delta_satang), 0)
    into unit_price from public.product_options where id = any(selected_option_ids);
    subtotal := subtotal + (unit_price * item_quantity);
  end loop;

  insert into public.queue_counters (shop_id, business_date, last_number)
  values (target_shop_id, active_session.business_date, 1)
  on conflict (shop_id, business_date) do update
  set last_number = public.queue_counters.last_number + 1, updated_at = now()
  returning last_number into queue_value;

  insert into public.orders (
    shop_id, store_session_id, business_date, queue_number, order_reference,
    source, status, payment_status, subtotal_satang, total_satang,
    customer_note, idempotency_key, tracking_token_hash
  ) values (
    target_shop_id, active_session.id, active_session.business_date, queue_value,
    'DP-' || to_char(active_session.business_date, 'YYYYMMDD') || '-' || lpad(queue_value::text, 3, '0'),
    'POS', 'QUEUED', 'UNPAID', subtotal, subtotal, btrim(order_note), request_idempotency_key,
    encode(extensions.digest(extensions.gen_random_uuid()::text, 'sha256'), 'hex')
  ) returning * into new_order;

  for cart_item in select value from jsonb_array_elements(cart_items)
  loop
    select * into product_row from public.products where id = (cart_item ->> 'productId')::uuid;
    item_quantity := (cart_item ->> 'quantity')::integer;
    item_note := coalesce(cart_item ->> 'note', '');
    select coalesce(array_agg(distinct value::uuid), array[]::uuid[])
    into selected_option_ids
    from jsonb_array_elements_text(coalesce(cart_item -> 'optionIds', '[]'::jsonb));
    select product_row.base_price_satang + coalesce(sum(price_delta_satang), 0)
    into unit_price from public.product_options where id = any(selected_option_ids);

    insert into public.order_items (
      order_id, product_id, product_name, unit_price_satang, quantity, item_note, line_total_satang
    ) values (
      new_order.id, product_row.id, product_row.name, unit_price, item_quantity,
      btrim(item_note), unit_price * item_quantity
    ) returning id into new_item_id;

    insert into public.order_item_options (order_item_id, product_option_id, option_name, price_delta_satang)
    select new_item_id, option.id, option.name, option.price_delta_satang
    from public.product_options as option where option.id = any(selected_option_ids);
  end loop;

  insert into public.order_events (order_id, shop_id, from_status, to_status, actor_user_id, metadata)
  values (new_order.id, target_shop_id, null, 'QUEUED', auth.uid(), jsonb_build_object('source', 'POS'));

  insert into public.audit_logs (shop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_shop_id, auth.uid(), 'POS_ORDER_CREATED', 'order', new_order.id,
    jsonb_build_object('queueNumber', new_order.queue_number, 'totalSatang', new_order.total_satang));

  return jsonb_build_object(
    'orderId', new_order.id,
    'queueNumber', new_order.queue_number,
    'orderReference', new_order.order_reference,
    'status', new_order.status,
    'totalSatang', new_order.total_satang
  );
end;
$$;

create or replace function public.list_active_staff_orders(target_shop_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not app_private.is_active_shop_member(target_shop_id) then
    raise exception using errcode = '42501', message = 'Active shop membership is required.';
  end if;

  select jsonb_build_object(
    'isOpen', exists (
      select 1 from public.store_sessions where shop_id = target_shop_id and status = 'OPEN'
    ),
    'orders', coalesce(jsonb_agg(order_payload order by created_at desc)
      filter (where order_payload is not null), '[]'::jsonb)
  ) into result
  from (
    select order_row.created_at, jsonb_build_object(
      'id', order_row.id,
      'queueNumber', order_row.queue_number,
      'orderReference', order_row.order_reference,
      'source', order_row.source,
      'status', order_row.status,
      'paymentStatus', order_row.payment_status,
      'totalSatang', order_row.total_satang,
      'customerNote', order_row.customer_note,
      'createdAt', order_row.created_at,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', item.id,
          'name', item.product_name,
          'quantity', item.quantity,
          'note', item.item_note,
          'lineTotalSatang', item.line_total_satang,
          'options', coalesce((
            select jsonb_agg(option_row.option_name order by option_row.created_at)
            from public.order_item_options as option_row where option_row.order_item_id = item.id
          ), '[]'::jsonb)
        ) order by item.created_at)
        from public.order_items as item where item.order_id = order_row.id
      ), '[]'::jsonb),
      'payment', (
        select jsonb_build_object(
          'method', payment.method,
          'amountReceivedSatang', payment.amount_received_satang,
          'changeSatang', payment.change_satang,
          'paidAt', payment.paid_at
        ) from public.payments as payment where payment.order_id = order_row.id
      )
    ) as order_payload
    from public.orders as order_row
    where order_row.shop_id = target_shop_id
      and order_row.status in ('QUEUED', 'PREPARING', 'READY')
    order by order_row.created_at desc
    limit 100
  ) as active_orders;

  return result;
end;
$$;

create or replace function public.update_order_status(
  target_order_id uuid,
  expected_status public.order_status,
  next_status public.order_status,
  cancellation_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders;
begin
  select * into target_order from public.orders where id = target_order_id for update;
  if target_order.id is null then
    raise exception using errcode = 'P0002', message = 'Order not found.';
  end if;
  if not app_private.is_active_shop_member(target_order.shop_id) then
    raise exception using errcode = '42501', message = 'Active shop membership is required.';
  end if;
  if target_order.status <> expected_status then
    raise exception using errcode = '40001', message = 'Order status changed on another device.';
  end if;

  if next_status = 'CANCELLED' then
    if target_order.status not in ('QUEUED', 'PREPARING', 'READY')
      or cancellation_reason is null
      or char_length(btrim(cancellation_reason)) not between 3 and 300 then
      raise exception using errcode = '22023', message = 'A valid cancellation reason is required.';
    end if;
    if target_order.payment_status <> 'UNPAID' then
      raise exception using errcode = 'P0001', message = 'Paid orders require an approved refund flow before cancellation.';
    end if;
  elsif not (
    (target_order.status = 'QUEUED' and next_status = 'PREPARING')
    or (target_order.status = 'PREPARING' and next_status = 'READY')
    or (target_order.status = 'READY' and next_status = 'COMPLETED')
  ) then
    raise exception using errcode = '22023', message = 'Invalid order status transition.';
  end if;

  if next_status = 'COMPLETED' and target_order.payment_status <> 'PAID' then
    raise exception using errcode = 'P0001', message = 'Payment is required before completing an order.';
  end if;

  update public.orders set status = next_status where id = target_order.id;
  insert into public.order_events (order_id, shop_id, from_status, to_status, actor_user_id, metadata)
  values (target_order.id, target_order.shop_id, target_order.status, next_status, auth.uid(),
    case when next_status = 'CANCELLED'
      then jsonb_build_object('reason', btrim(cancellation_reason)) else '{}'::jsonb end);

  return jsonb_build_object('orderId', target_order.id, 'status', next_status);
end;
$$;

create or replace function public.record_order_payment(
  target_order_id uuid,
  selected_method public.payment_method,
  amount_received_satang integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders;
  change_value integer;
  saved_payment public.payments;
begin
  select * into target_order from public.orders where id = target_order_id for update;
  if target_order.id is null then
    raise exception using errcode = 'P0002', message = 'Order not found.';
  end if;
  if not app_private.is_active_shop_member(target_order.shop_id) then
    raise exception using errcode = '42501', message = 'Active shop membership is required.';
  end if;
  if target_order.status = 'CANCELLED' then
    raise exception using errcode = 'P0001', message = 'Cancelled orders cannot be paid.';
  end if;
  if target_order.payment_status <> 'UNPAID'
    or exists (select 1 from public.payments where order_id = target_order.id) then
    raise exception using errcode = '23505', message = 'Payment has already been recorded.';
  end if;
  if amount_received_satang < target_order.total_satang then
    raise exception using errcode = '22023', message = 'Received amount is less than order total.';
  end if;
  if selected_method = 'BANK_TRANSFER' and amount_received_satang <> target_order.total_satang then
    raise exception using errcode = '22023', message = 'Bank transfer amount must equal order total.';
  end if;

  change_value := case when selected_method = 'CASH'
    then amount_received_satang - target_order.total_satang else 0 end;

  insert into public.payments (
    shop_id, order_id, method, paid_amount_satang, amount_received_satang, change_satang, confirmed_by
  ) values (
    target_order.shop_id, target_order.id, selected_method, target_order.total_satang,
    amount_received_satang, change_value, auth.uid()
  ) returning * into saved_payment;

  update public.orders set payment_status = 'PAID' where id = target_order.id;
  insert into public.audit_logs (shop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_order.shop_id, auth.uid(), 'PAYMENT_RECORDED', 'payment', saved_payment.id,
    jsonb_build_object('orderId', target_order.id, 'method', selected_method,
      'amountReceivedSatang', amount_received_satang, 'changeSatang', change_value));

  return jsonb_build_object(
    'orderId', target_order.id,
    'paymentStatus', 'PAID',
    'method', selected_method,
    'amountReceivedSatang', amount_received_satang,
    'changeSatang', change_value
  );
end;
$$;

revoke execute on function public.create_pos_order(uuid, uuid, jsonb, text) from public, anon;
revoke execute on function public.list_active_staff_orders(uuid) from public, anon;
revoke execute on function public.update_order_status(uuid, public.order_status, public.order_status, text) from public, anon;
revoke execute on function public.record_order_payment(uuid, public.payment_method, integer) from public, anon;
grant execute on function public.create_pos_order(uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.list_active_staff_orders(uuid) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, public.order_status, text) to authenticated;
grant execute on function public.record_order_payment(uuid, public.payment_method, integer) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;
end;
$$;

commit;

