begin;

create or replace function public.track_order(request_tracking_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'orderId', order_row.id,
    'shopId', order_row.shop_id,
    'shopName', shop.name,
    'queueNumber', order_row.queue_number,
    'orderReference', order_row.order_reference,
    'status', order_row.status,
    'totalSatang', order_row.total_satang,
    'createdAt', order_row.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', item.product_name,
        'quantity', item.quantity,
        'lineTotalSatang', item.line_total_satang,
        'options', coalesce((
          select jsonb_agg(option_item.option_name order by option_item.created_at)
          from public.order_item_options as option_item
          where option_item.order_item_id = item.id
        ), '[]'::jsonb)
      ) order by item.created_at)
      from public.order_items as item where item.order_id = order_row.id
    ), '[]'::jsonb)
  )
  from public.orders as order_row
  join public.shops as shop on shop.id = order_row.shop_id
  where order_row.tracking_token_hash = encode(
    extensions.digest(request_tracking_token::text, 'sha256'), 'hex'
  );
$$;

commit;
