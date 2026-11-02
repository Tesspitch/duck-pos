begin;

-- Complete any active paid order in one atomic transition; retain legacy transitions.
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

commit;
