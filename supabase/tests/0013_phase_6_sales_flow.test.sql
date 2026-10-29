begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

create temporary table phase6_context on commit drop as
select user_id
from public.shop_members
where status = 'ACTIVE' and role = 'OWNER'
order by created_at
limit 1;

insert into public.shops (id, name, timezone, created_by)
select 'cccccccc-0000-0000-0000-000000000001', 'Phase 6 Test Shop', 'Asia/Bangkok', user_id
from phase6_context;
insert into public.shop_members (shop_id, user_id, role, status, granted_by)
select 'cccccccc-0000-0000-0000-000000000001', user_id, 'OWNER', 'ACTIVE', user_id
from phase6_context;
insert into public.categories (id, shop_id, name)
values ('cccccccc-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', 'Phase 6 Category');
insert into public.products (id, shop_id, category_id, name, base_price_satang)
values ('cccccccc-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002', 'Analytics Kebab', 5000);
insert into public.store_sessions (id, shop_id, business_date, opened_by)
select 'cccccccc-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000001', current_date, user_id
from phase6_context;

insert into public.orders (
  id, shop_id, store_session_id, business_date, queue_number, order_reference, source, status,
  payment_status, subtotal_satang, total_satang, idempotency_key, tracking_token_hash
) values
  ('cccccccc-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000004', current_date, 1, 'PHASE6-PAID', 'POS', 'COMPLETED', 'PAID', 10000, 10000, 'cccccccc-0000-0000-0000-000000000008', repeat('1', 64)),
  ('cccccccc-0000-0000-0000-000000000006', 'cccccccc-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000004', current_date, 2, 'PHASE6-UNPAID', 'QR', 'QUEUED', 'UNPAID', 5000, 5000, 'cccccccc-0000-0000-0000-000000000009', repeat('2', 64)),
  ('cccccccc-0000-0000-0000-000000000007', 'cccccccc-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000004', current_date, 3, 'PHASE6-CANCEL', 'POS', 'CANCELLED', 'UNPAID', 2000, 2000, 'cccccccc-0000-0000-0000-000000000010', repeat('3', 64));

insert into public.order_items (order_id, product_id, product_name, unit_price_satang, quantity, line_total_satang)
values
  ('cccccccc-0000-0000-0000-000000000005', 'cccccccc-0000-0000-0000-000000000003', 'Analytics Kebab', 5000, 2, 10000),
  ('cccccccc-0000-0000-0000-000000000006', 'cccccccc-0000-0000-0000-000000000003', 'Analytics Kebab', 5000, 1, 5000),
  ('cccccccc-0000-0000-0000-000000000007', 'cccccccc-0000-0000-0000-000000000003', 'Analytics Kebab', 2000, 1, 2000);

insert into public.payments (shop_id, order_id, method, paid_amount_satang, amount_received_satang, change_satang, confirmed_by)
select 'cccccccc-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000005', 'CASH', 10000, 12000, 2000, user_id
from phase6_context;

select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', (select user_id from phase6_context), 'role', 'authenticated')::text,
  true
);

create temporary table phase6_dashboard on commit drop as
select public.get_sales_dashboard(
  'cccccccc-0000-0000-0000-000000000001', current_date, current_date, null, 'DAY'
) as payload;

select is((select (payload ->> 'grossOrderValueSatang')::bigint from phase6_dashboard), 15000::bigint, 'gross excludes cancelled orders');
select is((select (payload ->> 'netCollectedSalesSatang')::bigint from phase6_dashboard), 10000::bigint, 'net collected uses paid payment');
select is((select (payload ->> 'paidOrders')::integer from phase6_dashboard), 1, 'paid order count');
select is((select (payload ->> 'unpaidOrders')::integer from phase6_dashboard), 1, 'unpaid order count excludes cancelled');
select is((select (payload ->> 'cancelledOrders')::integer from phase6_dashboard), 1, 'cancelled order count');
select is((select (payload ->> 'productsSold')::integer from phase6_dashboard), 2, 'products sold uses paid non-cancelled order');
select is((select (payload ->> 'averageOrderValueSatang')::bigint from phase6_dashboard), 7500::bigint, 'average order value');
select is((select (payload ->> 'cashSalesSatang')::bigint from phase6_dashboard), 10000::bigint, 'cash sales total');
select is((select (payload ->> 'transferSalesSatang')::bigint from phase6_dashboard), 0::bigint, 'transfer sales total');
select is((select jsonb_array_length(payload -> 'bestSellingProducts') from phase6_dashboard), 1, 'best seller returned');
select is((select jsonb_array_length(payload -> 'trend') from phase6_dashboard), 1, 'daily trend returned');
select is(
  (public.search_sales_history(
    'cccccccc-0000-0000-0000-000000000001', current_date, current_date,
    null, null, null, null, null, 'Analytics Kebab', 'LATEST', 1, 25
  ) ->> 'totalCount')::integer,
  3,
  'history searches product snapshot'
);
select is(jsonb_array_length(public.list_sales_sessions('cccccccc-0000-0000-0000-000000000001')), 1, 'session filter option returned');

select * from finish();
rollback;
