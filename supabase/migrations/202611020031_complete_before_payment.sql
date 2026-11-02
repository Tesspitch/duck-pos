begin;

create index if not exists orders_shop_unpaid_completed_created_idx
  on public.orders (shop_id, created_at desc)
  where status = 'COMPLETED' and payment_status = 'UNPAID';

-- Completion and collection are independent; unpaid completed orders remain collectible.
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
    or (target_order.status in ('QUEUED', 'PREPARING', 'READY') and next_status = 'COMPLETED')
  ) then
    raise exception using errcode = '22023', message = 'Invalid order status transition.';
  end if;


  update public.orders set status = next_status where id = target_order.id;
  insert into public.order_events (order_id, shop_id, from_status, to_status, actor_user_id, metadata)
  values (target_order.id, target_order.shop_id, target_order.status, next_status, auth.uid(),
    case when next_status = 'CANCELLED'
      then jsonb_build_object('reason', btrim(cancellation_reason)) else '{}'::jsonb end);

  return jsonb_build_object('orderId', target_order.id, 'status', next_status);
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
      and (order_row.status in ('QUEUED', 'PREPARING', 'READY')
        or (order_row.status = 'COMPLETED' and order_row.payment_status = 'UNPAID'))
    order by order_row.created_at desc
    limit 100
  ) as active_orders;

  return result;
end;
$$;

commit;
