begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

select has_column('public', 'topping_groups', 'selection_mode', 'topping groups store selection mode');
select has_column('public', 'topping_groups', 'pricing_mode', 'topping groups store pricing mode');
select has_column('public', 'option_groups', 'additional_selection_price_satang', 'materialized groups store additional price');
select has_function('app_private', 'get_priced_product_options', array['uuid', 'uuid[]']);

create temporary table first_free_context (
  user_id uuid,
  group_id uuid,
  topping_one uuid,
  topping_two uuid,
  topping_three uuid
) on commit drop;

insert into first_free_context (user_id)
select user_id from public.shop_members
where status = 'ACTIVE' and role = 'OWNER'
order by created_at limit 1;

insert into public.shops (id, name, timezone, created_by)
select 'cdcdcdcd-0000-0000-0000-000000000001', 'First Free Shop', 'Asia/Bangkok', user_id
from first_free_context;
insert into public.shop_members (shop_id, user_id, role, status, granted_by)
select 'cdcdcdcd-0000-0000-0000-000000000001', user_id, 'OWNER', 'ACTIVE', user_id
from first_free_context;
insert into public.categories (id, shop_id, name, sort_order)
values ('cdcdcdcd-0000-0000-0000-000000000002', 'cdcdcdcd-0000-0000-0000-000000000001', 'Kebab', 0);
insert into public.products (id, shop_id, category_id, name, base_price_satang)
values ('cdcdcdcd-0000-0000-0000-000000000003', 'cdcdcdcd-0000-0000-0000-000000000001', 'cdcdcdcd-0000-0000-0000-000000000002', 'Chicken Kebab', 10000);

select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', (select user_id from first_free_context), 'role', 'authenticated')::text,
  true
);

select lives_ok(
  $$update first_free_context set group_id = public.save_topping_group(
    'cdcdcdcd-0000-0000-0000-000000000001', null, 'Sauce',
    'MULTIPLE', false, 'FIRST_FREE_THEN_FIXED', 1000, true,
    array['cdcdcdcd-0000-0000-0000-000000000002']::uuid[]
  )$$,
  'owner creates a multiple-choice first-free sauce group'
);

select lives_ok(
  $$update first_free_context set topping_one = public.save_topping(
    'cdcdcdcd-0000-0000-0000-000000000001', null, (select group_id from first_free_context),
    'Garlic', 5000, true, true
  ), topping_two = public.save_topping(
    'cdcdcdcd-0000-0000-0000-000000000001', null, (select group_id from first_free_context),
    'Chili', 5000, true, true
  ), topping_three = public.save_topping(
    'cdcdcdcd-0000-0000-0000-000000000001', null, (select group_id from first_free_context),
    'BBQ', 5000, true, true
  )$$,
  'owner creates sauces without individual prices leaking into fixed pricing'
);

select is(
  (select sum(effective_price_delta_satang)::integer
   from app_private.get_priced_product_options(
     'cdcdcdcd-0000-0000-0000-000000000003',
     array(
       select id from public.product_options
       where option_group_id = (select id from public.option_groups
         where product_id = 'cdcdcdcd-0000-0000-0000-000000000003'
           and topping_group_id = (select group_id from first_free_context))
     )
   )),
  2000,
  'first of three sauces is free and the other two cost the configured fixed price'
);

select is(
  (select sum(effective_price_delta_satang)::integer
   from app_private.get_priced_product_options(
     'cdcdcdcd-0000-0000-0000-000000000003',
     array[(select id from public.product_options
       where topping_id = (select topping_one from first_free_context))]
   )),
  0,
  'one selected sauce is free'
);

select is((select max_select from public.option_groups
  where product_id = 'cdcdcdcd-0000-0000-0000-000000000003'), 3,
  'multiple-choice materialization allows all three visible sauces');
select is((select min_select from public.option_groups
  where product_id = 'cdcdcdcd-0000-0000-0000-000000000003'), 0,
  'optional group materialization allows no sauce');

select is(
  public.get_topping_library('cdcdcdcd-0000-0000-0000-000000000001') -> 'groups' -> 0 ->> 'pricingMode',
  'FIRST_FREE_THEN_FIXED',
  'management payload exposes pricing mode'
);
select is(
  public.get_public_menu('cdcdcdcd-0000-0000-0000-000000000001') -> 'categories' -> 0 -> 'products' -> 0 -> 'optionGroups' -> 0 ->> 'selectionMode',
  'MULTIPLE',
  'public menu exposes selection mode'
);

insert into public.store_sessions (shop_id, business_date, opened_by)
select 'cdcdcdcd-0000-0000-0000-000000000001', current_date, user_id
from first_free_context;
insert into public.shop_locations (shop_id, latitude, longitude)
values ('cdcdcdcd-0000-0000-0000-000000000001', 13.756300, 100.501800);

select lives_ok(
  $$select public.create_pos_order(
    'cdcdcdcd-0000-0000-0000-000000000001',
    'cdcdcdcd-0000-0000-0000-000000000010',
    jsonb_build_array(jsonb_build_object(
      'productId', 'cdcdcdcd-0000-0000-0000-000000000003',
      'quantity', 1,
      'note', '',
      'optionIds', (select jsonb_agg(id) from public.product_options
        where option_group_id = (select id from public.option_groups
          where product_id = 'cdcdcdcd-0000-0000-0000-000000000003'))
    )),
    ''
  )$$,
  'POS checkout accepts three sauces'
);
select is(
  (select total_satang from public.orders where idempotency_key = 'cdcdcdcd-0000-0000-0000-000000000010'),
  12000,
  'POS order total includes two paid sauces'
);
select is(
  (select string_agg(item_option.price_delta_satang::text, ',' order by item_option.price_delta_satang)
   from public.order_item_options as item_option
   join public.order_items as item on item.id = item_option.order_item_id
   join public.orders as order_row on order_row.id = item.order_id
   where order_row.idempotency_key = 'cdcdcdcd-0000-0000-0000-000000000010'),
  '0,1000,1000',
  'POS option snapshots preserve one free and two paid sauces'
);

select lives_ok(
  $$select public.create_qr_order(
    'cdcdcdcd-0000-0000-0000-000000000001',
    'cdcdcdcd-0000-0000-0000-000000000011',
    'cdcdcdcd-0000-0000-0000-000000000012',
    13.756300, 100.501800, 5, now(),
    jsonb_build_array(jsonb_build_object(
      'productId', 'cdcdcdcd-0000-0000-0000-000000000003',
      'quantity', 1,
      'note', '',
      'optionIds', (select jsonb_agg(id) from public.product_options
        where option_group_id = (select id from public.option_groups
          where product_id = 'cdcdcdcd-0000-0000-0000-000000000003'))
    )),
    ''
  )$$,
  'QR checkout accepts three sauces inside the geofence'
);
select is(
  (select total_satang from public.orders where idempotency_key = 'cdcdcdcd-0000-0000-0000-000000000011'),
  12000,
  'QR order total includes two paid sauces'
);
select is(
  (select string_agg(item_option.price_delta_satang::text, ',' order by item_option.price_delta_satang)
   from public.order_item_options as item_option
   join public.order_items as item on item.id = item_option.order_item_id
   join public.orders as order_row on order_row.id = item.order_id
   where order_row.idempotency_key = 'cdcdcdcd-0000-0000-0000-000000000011'),
  '0,1000,1000',
  'QR option snapshots preserve one free and two paid sauces'
);
select ok(
  pg_get_functiondef('public.create_qr_order(uuid,uuid,uuid,double precision,double precision,double precision,timestamp with time zone,jsonb,text)'::regprocedure)
    like '%get_priced_product_options%',
  'QR checkout uses server-authoritative first-free pricing'
);
select ok(
  pg_get_functiondef('public.create_pos_order(uuid,uuid,jsonb,text)'::regprocedure)
    like '%get_priced_product_options%',
  'POS checkout uses server-authoritative first-free pricing'
);
select throws_ok(
  $$select public.save_topping_group(
    'cdcdcdcd-0000-0000-0000-000000000001', null, 'Invalid',
    'SINGLE', false, 'FIRST_FREE_THEN_FIXED', 1000, true,
    array['cdcdcdcd-0000-0000-0000-000000000002']::uuid[]
  )$$,
  '22023',
  'Invalid topping selection or pricing rule.',
  'first-free pricing cannot be combined with single choice'
);

select * from finish();
rollback;
