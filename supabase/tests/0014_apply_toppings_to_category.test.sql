begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

select has_function('public', 'apply_option_group_to_category', array['uuid', 'uuid']);
select ok(has_function_privilege('authenticated', 'public.apply_option_group_to_category(uuid,uuid)', 'EXECUTE'), 'authenticated can call owner-checked apply RPC');
select ok(not has_function_privilege('anon', 'public.apply_option_group_to_category(uuid,uuid)', 'EXECUTE'), 'anonymous cannot apply toppings');

create temporary table topping_context on commit drop as
select user_id
from public.shop_members
where status = 'ACTIVE' and role = 'OWNER'
order by created_at
limit 1;

insert into public.shops (id, name, timezone, created_by)
select 'dddddddd-0000-0000-0000-000000000001', 'Topping Test Shop', 'Asia/Bangkok', user_id
from topping_context;
insert into public.shop_members (shop_id, user_id, role, status, granted_by)
select 'dddddddd-0000-0000-0000-000000000001', user_id, 'OWNER', 'ACTIVE', user_id
from topping_context;
insert into public.categories (id, shop_id, name)
values
  ('dddddddd-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001', 'Same Category'),
  ('dddddddd-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000001', 'Other Category');
insert into public.products (id, shop_id, category_id, name, base_price_satang)
values
  ('dddddddd-0000-0000-0000-000000000004', 'dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002', 'Source', 10000),
  ('dddddddd-0000-0000-0000-000000000005', 'dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002', 'Target New', 10000),
  ('dddddddd-0000-0000-0000-000000000006', 'dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002', 'Target Merge', 10000),
  ('dddddddd-0000-0000-0000-000000000007', 'dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000003', 'Other Category Product', 10000);
insert into public.option_groups (id, shop_id, product_id, name, min_select, max_select, sort_order)
values
  ('dddddddd-0000-0000-0000-000000000008', 'dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000004', 'Toppings', 0, 3, 2),
  ('dddddddd-0000-0000-0000-000000000009', 'dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000006', 'toppings', 0, 1, 0);
insert into public.product_options (id, shop_id, option_group_id, name, price_delta_satang, sort_order)
values
  ('dddddddd-0000-0000-0000-000000000010', 'dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000008', 'Cheese', 2000, 1),
  ('dddddddd-0000-0000-0000-000000000011', 'dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000008', 'Egg', 1500, 2),
  ('dddddddd-0000-0000-0000-000000000012', 'dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000009', 'cheese', 500, 8),
  ('dddddddd-0000-0000-0000-000000000013', 'dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000009', 'Target Only', 300, 9);

select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', (select user_id from topping_context), 'role', 'authenticated')::text,
  true
);

select lives_ok(
  $$select public.apply_option_group_to_category('dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000008')$$,
  'owner applies group to category'
);
select is((select count(*)::integer from public.option_groups where shop_id = 'dddddddd-0000-0000-0000-000000000001'), 3, 'one missing group is created');
select is((select max_select from public.option_groups where id = 'dddddddd-0000-0000-0000-000000000009'), 3, 'existing matching group settings are updated');
select is((select price_delta_satang from public.product_options where id = 'dddddddd-0000-0000-0000-000000000012'), 2000, 'existing matching topping is updated');
select is((select count(*)::integer from public.product_options where option_group_id = 'dddddddd-0000-0000-0000-000000000009'), 3, 'missing topping is inserted and target-only topping is preserved');
select is((select count(*)::integer from public.option_groups where product_id = 'dddddddd-0000-0000-0000-000000000007'), 0, 'other category is untouched');
select lives_ok(
  $$select public.apply_option_group_to_category('dddddddd-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000008')$$,
  'repeated apply is idempotent'
);
select is((select count(*)::integer from public.product_options where shop_id = 'dddddddd-0000-0000-0000-000000000001'), 7, 'repeated apply creates no duplicates');

select * from finish();
rollback;
