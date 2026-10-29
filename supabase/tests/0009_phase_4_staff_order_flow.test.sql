begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

create temporary table phase4_context on commit drop as
select shop_id, user_id
from public.shop_members
where status = 'ACTIVE' and role = 'OWNER'
order by created_at
limit 1;

insert into public.categories (id, shop_id, name)
select 'aaaaaaaa-0000-0000-0000-000000000001', shop_id, 'Phase 4 Test'
from phase4_context;
insert into public.products (id, shop_id, category_id, name, base_price_satang)
select
  'aaaaaaaa-0000-0000-0000-000000000002',
  shop_id,
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Test Kebab',
  10000
from phase4_context;
insert into public.store_sessions (shop_id, business_date, opened_by)
select
  context.shop_id,
  current_date,
  context.user_id
from phase4_context as context
where not exists (
  select 1 from public.store_sessions
  where shop_id = context.shop_id and status = 'OPEN'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', (select user_id from phase4_context), 'role', 'authenticated')::text,
  true
);

select lives_ok(
  $$select public.create_pos_order(
    (select shop_id from phase4_context),
    'aaaaaaaa-0000-0000-0000-000000000003',
    '[{"productId":"aaaaaaaa-0000-0000-0000-000000000002","quantity":1,"note":"","optionIds":[]}]'::jsonb,
    'test'
  )$$,
  'creates POS order'
);
select lives_ok(
  $$select public.create_pos_order(
    (select shop_id from phase4_context),
    'aaaaaaaa-0000-0000-0000-000000000003',
    '[{"productId":"aaaaaaaa-0000-0000-0000-000000000002","quantity":1,"note":"","optionIds":[]}]'::jsonb,
    'test'
  )$$,
  'idempotent retry succeeds'
);
select is(
  (select count(*)::integer from public.orders where idempotency_key = 'aaaaaaaa-0000-0000-0000-000000000003'),
  1,
  'retry creates one order'
);
select is(
  (select total_satang from public.orders where idempotency_key = 'aaaaaaaa-0000-0000-0000-000000000003'),
  10000,
  'server price is correct'
);
select is(
  (select source::text from public.orders where idempotency_key = 'aaaaaaaa-0000-0000-0000-000000000003'),
  'POS',
  'source is POS'
);
select lives_ok(
  $$select public.update_order_status(
    (select id from public.orders where idempotency_key = 'aaaaaaaa-0000-0000-0000-000000000003'),
    'QUEUED', 'PREPARING'
  )$$,
  'moves to preparing'
);
select lives_ok(
  $$select public.update_order_status(
    (select id from public.orders where idempotency_key = 'aaaaaaaa-0000-0000-0000-000000000003'),
    'PREPARING', 'READY'
  )$$,
  'moves to ready'
);
select lives_ok(
  $$select public.record_order_payment(
    (select id from public.orders where idempotency_key = 'aaaaaaaa-0000-0000-0000-000000000003'),
    'CASH', 20000
  )$$,
  'records cash payment'
);
select is(
  (select change_satang from public.payments where order_id = (
    select id from public.orders where idempotency_key = 'aaaaaaaa-0000-0000-0000-000000000003'
  )),
  10000,
  'cash change is correct'
);
select is(
  (select payment_status::text from public.orders where idempotency_key = 'aaaaaaaa-0000-0000-0000-000000000003'),
  'PAID',
  'order is paid'
);
select lives_ok(
  $$select public.update_order_status(
    (select id from public.orders where idempotency_key = 'aaaaaaaa-0000-0000-0000-000000000003'),
    'READY', 'COMPLETED'
  )$$,
  'paid order completes'
);
select is(
  (select status::text from public.orders where idempotency_key = 'aaaaaaaa-0000-0000-0000-000000000003'),
  'COMPLETED',
  'order status is completed'
);
select is(
  (select count(*)::integer from public.order_events where order_id = (
    select id from public.orders where idempotency_key = 'aaaaaaaa-0000-0000-0000-000000000003'
  )),
  4,
  'status history has four events'
);

select * from finish();
rollback;

