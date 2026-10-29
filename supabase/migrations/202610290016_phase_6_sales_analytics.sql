begin;

create index orders_shop_business_date_created_idx
  on public.orders (shop_id, business_date desc, created_at desc, id);
create index orders_shop_session_created_idx
  on public.orders (shop_id, store_session_id, created_at desc, id);
create index payments_shop_status_method_idx
  on public.payments (shop_id, status, method, paid_at desc);

create or replace function app_private.require_sales_owner(target_shop_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app_private.is_active_shop_member(target_shop_id, array['OWNER']::public.shop_role[]) then
    raise exception using errcode = '42501', message = 'Only an active shop owner can view sales reports.';
  end if;
end;
$$;

create or replace function app_private.validate_sales_range(date_from date, date_to date)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if date_from is null or date_to is null then
    raise exception using errcode = '22023', message = 'Date range is required.';
  end if;
  if date_from > date_to then
    raise exception using errcode = '22023', message = 'Start date must not be after end date.';
  end if;
  if date_to - date_from > 365 then
    raise exception using errcode = '22023', message = 'Date range cannot exceed 366 days.';
  end if;
end;
$$;

create or replace function public.get_sales_dashboard(
  target_shop_id uuid,
  date_from date,
  date_to date,
  target_store_session_id uuid default null,
  bucket_unit text default 'DAY'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform app_private.require_sales_owner(target_shop_id);
  perform app_private.validate_sales_range(date_from, date_to);
  if bucket_unit not in ('DAY', 'MONTH') then
    raise exception using errcode = '22023', message = 'Bucket unit must be DAY or MONTH.';
  end if;

  with selected_orders as materialized (
    select orders.*
    from public.orders
    where orders.shop_id = target_shop_id
      and orders.business_date between date_from and date_to
      and (target_store_session_id is null or orders.store_session_id = target_store_session_id)
  ), selected_payments as materialized (
    select payment.*
    from public.payments as payment
    join selected_orders as orders on orders.id = payment.order_id
  ), metrics as (
    select
      coalesce(sum(orders.total_satang) filter (where orders.status <> 'CANCELLED'), 0)::bigint as gross_value,
      count(*) filter (where orders.status <> 'CANCELLED' and orders.payment_status = 'PAID')::integer as paid_orders,
      count(*) filter (where orders.status <> 'CANCELLED' and orders.payment_status = 'UNPAID')::integer as unpaid_orders,
      count(*) filter (where orders.status = 'CANCELLED')::integer as cancelled_orders,
      count(*) filter (where orders.status <> 'CANCELLED')::integer as valid_orders
    from selected_orders as orders
  ), payment_metrics as (
    select
      coalesce(sum(payment.paid_amount_satang) filter (where payment.status = 'PAID'), 0)::bigint as net_collected,
      coalesce(sum(payment.paid_amount_satang) filter (where payment.status = 'PAID' and payment.method = 'CASH'), 0)::bigint as cash_sales,
      coalesce(sum(payment.paid_amount_satang) filter (where payment.status = 'PAID' and payment.method = 'BANK_TRANSFER'), 0)::bigint as transfer_sales
    from selected_payments as payment
  ), product_metrics as (
    select coalesce(sum(item.quantity), 0)::integer as products_sold
    from public.order_items as item
    join selected_orders as orders on orders.id = item.order_id
    where orders.status <> 'CANCELLED' and orders.payment_status = 'PAID'
  ), best_products as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'productId', ranked.product_id,
      'productName', ranked.product_name,
      'quantity', ranked.quantity,
      'salesSatang', ranked.sales_satang
    ) order by ranked.quantity desc, ranked.sales_satang desc, ranked.product_name), '[]'::jsonb) as payload
    from (
      select item.product_id, item.product_name, sum(item.quantity)::integer as quantity,
        sum(item.line_total_satang)::bigint as sales_satang
      from public.order_items as item
      join selected_orders as orders on orders.id = item.order_id
      where orders.status <> 'CANCELLED' and orders.payment_status = 'PAID'
      group by item.product_id, item.product_name
      order by quantity desc, sales_satang desc, item.product_name
      limit 10
    ) as ranked
  ), source_sales as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'source', source_row.source,
      'orderCount', source_row.order_count,
      'collectedSatang', source_row.collected_satang
    ) order by source_row.source), '[]'::jsonb) as payload
    from (
      select orders.source, count(*)::integer as order_count,
        coalesce(sum(payment.paid_amount_satang), 0)::bigint as collected_satang
      from selected_orders as orders
      join selected_payments as payment on payment.order_id = orders.id and payment.status = 'PAID'
      where orders.status <> 'CANCELLED'
      group by orders.source
    ) as source_row
  ), trend as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'period', trend_row.period,
      'grossOrderValueSatang', trend_row.gross_value,
      'netCollectedSalesSatang', trend_row.net_collected,
      'orderCount', trend_row.order_count
    ) order by trend_row.period), '[]'::jsonb) as payload
    from (
      select
        case when bucket_unit = 'MONTH'
          then to_char(date_trunc('month', orders.business_date::timestamp), 'YYYY-MM')
          else to_char(orders.business_date, 'YYYY-MM-DD') end as period,
        coalesce(sum(orders.total_satang) filter (where orders.status <> 'CANCELLED'), 0)::bigint as gross_value,
        coalesce(sum(payment.paid_amount_satang) filter (where payment.status = 'PAID'), 0)::bigint as net_collected,
        count(*) filter (where orders.status <> 'CANCELLED')::integer as order_count
      from selected_orders as orders
      left join selected_payments as payment on payment.order_id = orders.id
      group by period
    ) as trend_row
  )
  select jsonb_build_object(
    'grossOrderValueSatang', metrics.gross_value,
    'netCollectedSalesSatang', payment_metrics.net_collected,
    'paidOrders', metrics.paid_orders,
    'unpaidOrders', metrics.unpaid_orders,
    'cancelledOrders', metrics.cancelled_orders,
    'productsSold', product_metrics.products_sold,
    'averageOrderValueSatang', case when metrics.valid_orders = 0 then 0 else metrics.gross_value / metrics.valid_orders end,
    'cashSalesSatang', payment_metrics.cash_sales,
    'transferSalesSatang', payment_metrics.transfer_sales,
    'bestSellingProducts', best_products.payload,
    'sourceSales', source_sales.payload,
    'trend', trend.payload
  ) into result
  from metrics cross join payment_metrics cross join product_metrics
  cross join best_products cross join source_sales cross join trend;

  return result;
end;
$$;

create or replace function public.search_sales_history(
  target_shop_id uuid,
  date_from date,
  date_to date,
  target_store_session_id uuid default null,
  selected_source public.order_source default null,
  selected_order_status public.order_status default null,
  selected_payment_status public.payment_status default null,
  selected_payment_method public.payment_method default null,
  search_text text default '',
  sort_mode text default 'LATEST',
  page_number integer default 1,
  page_size integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform app_private.require_sales_owner(target_shop_id);
  perform app_private.validate_sales_range(date_from, date_to);
  if sort_mode not in ('LATEST', 'OLDEST', 'HIGHEST_AMOUNT', 'LOWEST_AMOUNT') then
    raise exception using errcode = '22023', message = 'Invalid sales history sort mode.';
  end if;
  if page_number < 1 or page_size < 1 or page_size > 250 then
    raise exception using errcode = '22023', message = 'Invalid pagination parameters.';
  end if;

  with filtered as materialized (
    select orders.*, payment.method, payment.paid_amount_satang, payment.paid_at,
      count(*) over()::integer as total_count
    from public.orders as orders
    left join public.payments as payment on payment.order_id = orders.id
    where orders.shop_id = target_shop_id
      and orders.business_date between date_from and date_to
      and (target_store_session_id is null or orders.store_session_id = target_store_session_id)
      and (selected_source is null or orders.source = selected_source)
      and (selected_order_status is null or orders.status = selected_order_status)
      and (selected_payment_status is null or orders.payment_status = selected_payment_status)
      and (selected_payment_method is null or payment.method = selected_payment_method)
      and (
        nullif(btrim(search_text), '') is null
        or orders.order_reference ilike '%' || btrim(search_text) || '%'
        or orders.queue_number::text = btrim(search_text)
        or exists (
          select 1 from public.order_items as search_item
          where search_item.order_id = orders.id
            and search_item.product_name ilike '%' || btrim(search_text) || '%'
        )
      )
  ), paged as (
    select * from filtered
    order by
      case when sort_mode = 'OLDEST' then created_at end asc,
      case when sort_mode = 'HIGHEST_AMOUNT' then total_satang end desc,
      case when sort_mode = 'LOWEST_AMOUNT' then total_satang end asc,
      case when sort_mode = 'LATEST' then created_at end desc,
      id desc
    offset (page_number - 1) * page_size
    limit page_size
  )
  select jsonb_build_object(
    'totalCount', coalesce((select max(total_count) from filtered), 0),
    'page', page_number,
    'pageSize', page_size,
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'id', paged.id,
      'businessDate', paged.business_date,
      'createdAt', paged.created_at,
      'storeSessionId', paged.store_session_id,
      'queueNumber', paged.queue_number,
      'orderReference', paged.order_reference,
      'source', paged.source,
      'orderStatus', paged.status,
      'paymentStatus', paged.payment_status,
      'paymentMethod', paged.method,
      'totalSatang', paged.total_satang,
      'paidAmountSatang', paged.paid_amount_satang,
      'paidAt', paged.paid_at,
      'products', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'name', item.product_name,
          'quantity', item.quantity
        ) order by item.created_at), '[]'::jsonb)
        from public.order_items as item where item.order_id = paged.id
      )
    ) order by
      case when sort_mode = 'OLDEST' then paged.created_at end asc,
      case when sort_mode = 'HIGHEST_AMOUNT' then paged.total_satang end desc,
      case when sort_mode = 'LOWEST_AMOUNT' then paged.total_satang end asc,
      case when sort_mode = 'LATEST' then paged.created_at end desc,
      paged.id desc
    ), '[]'::jsonb)
  ) into result
  from paged;

  return result;
end;
$$;

create or replace function public.list_sales_sessions(target_shop_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app_private.require_sales_owner(target_shop_id);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', session.id,
      'businessDate', session.business_date,
      'status', session.status,
      'openedAt', session.opened_at,
      'closedAt', session.closed_at
    ) order by session.opened_at desc)
    from (
      select id, business_date, status, opened_at, closed_at
      from public.store_sessions
      where shop_id = target_shop_id
      order by opened_at desc
      limit 100
    ) as session
  ), '[]'::jsonb);
end;
$$;

revoke execute on function app_private.require_sales_owner(uuid) from public, anon, authenticated;
revoke execute on function app_private.validate_sales_range(date, date) from public, anon, authenticated;
revoke execute on function public.get_sales_dashboard(uuid, date, date, uuid, text) from public, anon;
revoke execute on function public.search_sales_history(uuid, date, date, uuid, public.order_source, public.order_status, public.payment_status, public.payment_method, text, text, integer, integer) from public, anon;
revoke execute on function public.list_sales_sessions(uuid) from public, anon;
grant execute on function public.get_sales_dashboard(uuid, date, date, uuid, text) to authenticated;
grant execute on function public.search_sales_history(uuid, date, date, uuid, public.order_source, public.order_status, public.payment_status, public.payment_method, text, text, integer, integer) to authenticated;
grant execute on function public.list_sales_sessions(uuid) to authenticated;

commit;
