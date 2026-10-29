begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

select has_table('public', 'topping_groups', 'reusable topping groups table exists');
select has_table('public', 'toppings', 'reusable toppings table exists');
select has_table('public', 'category_topping_groups', 'category mapping table exists');
select has_function('public', 'get_topping_library', array['uuid']);
select has_function('public', 'save_topping_group', array['uuid', 'uuid', 'text', 'text', 'boolean', 'text', 'integer', 'boolean', 'uuid[]']);
select has_function('public', 'save_topping', array['uuid', 'uuid', 'uuid', 'text', 'integer', 'boolean', 'boolean']);
select has_function('public', 'set_topping_availability', array['uuid', 'uuid', 'boolean']);
select ok(has_function_privilege('authenticated', 'public.get_topping_library(uuid)', 'EXECUTE'), 'members can load topping library');
select ok(not has_function_privilege('anon', 'public.get_topping_library(uuid)', 'EXECUTE'), 'anonymous cannot load topping management');

create temporary table reusable_topping_context (
  user_id uuid,
  group_id uuid,
  topping_id uuid
) on commit drop;

insert into reusable_topping_context (user_id)
select user_id from public.shop_members
where status = 'ACTIVE' and role = 'OWNER'
order by created_at limit 1;

insert into public.shops (id, name, timezone, created_by)
select 'abababab-0000-0000-0000-000000000001', 'Reusable Topping Shop', 'Asia/Bangkok', user_id
from reusable_topping_context;
insert into public.shop_members (shop_id, user_id, role, status, granted_by)
select 'abababab-0000-0000-0000-000000000001', user_id, 'OWNER', 'ACTIVE', user_id
from reusable_topping_context;
insert into public.categories (id, shop_id, name, sort_order)
values
  ('abababab-0000-0000-0000-000000000002', 'abababab-0000-0000-0000-000000000001', 'Kebab', 0),
  ('abababab-0000-0000-0000-000000000003', 'abababab-0000-0000-0000-000000000001', 'Rice', 1);
insert into public.products (id, shop_id, category_id, name, base_price_satang)
values ('abababab-0000-0000-0000-000000000004', 'abababab-0000-0000-0000-000000000001', 'abababab-0000-0000-0000-000000000002', 'Kebab A', 10000);

select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', (select user_id from reusable_topping_context), 'role', 'authenticated')::text,
  true
);

select lives_ok(
  $$update reusable_topping_context set group_id = public.save_topping_group(
    'abababab-0000-0000-0000-000000000001', null, 'Extra', 'MULTIPLE', false, 'PER_TOPPING', 0, true,
    array['abababab-0000-0000-0000-000000000002', 'abababab-0000-0000-0000-000000000003']::uuid[]
  )$$,
  'owner creates a reusable group and maps menu categories'
);
select is((select count(*)::integer from public.category_topping_groups where topping_group_id = (select group_id from reusable_topping_context)), 2, 'group is mapped to both categories');

select lives_ok(
  $$update reusable_topping_context set topping_id = public.save_topping(
    'abababab-0000-0000-0000-000000000001', null,
    (select group_id from reusable_topping_context), 'Cheese', 2000, true, true
  )$$,
  'owner adds one topping once'
);
select is((select count(*)::integer from public.option_groups where topping_group_id = (select group_id from reusable_topping_context)), 1, 'existing product receives one materialized group');
select is((select count(*)::integer from public.product_options where topping_id = (select topping_id from reusable_topping_context)), 1, 'existing product receives one materialized topping');

select lives_ok(
  $$insert into public.products (id, shop_id, category_id, name, base_price_satang)
    values ('abababab-0000-0000-0000-000000000005', 'abababab-0000-0000-0000-000000000001', 'abababab-0000-0000-0000-000000000003', 'Rice A', 12000)$$,
  'new product inherits mapped topping group automatically'
);
select is((select count(*)::integer from public.option_groups where topping_group_id = (select group_id from reusable_topping_context)), 2, 'both products have the reusable group');
select is((select count(*)::integer from public.product_options where topping_id = (select topping_id from reusable_topping_context)), 2, 'both products have the reusable topping');

select lives_ok(
  $$select public.set_topping_availability(
    'abababab-0000-0000-0000-000000000001',
    (select topping_id from reusable_topping_context), false
  )$$,
  'staff-compatible availability command updates reusable topping'
);
select ok(not exists (
  select 1 from public.product_options
  where topping_id = (select topping_id from reusable_topping_context) and is_available
), 'availability is synchronized to every product');
select is(
  jsonb_array_length(public.get_topping_library('abababab-0000-0000-0000-000000000001') -> 'groups' -> 0 -> 'categoryIds'),
  2,
  'management response returns selected categories'
);

select lives_ok(
  $$select public.save_topping_group(
    'abababab-0000-0000-0000-000000000001',
    (select group_id from reusable_topping_context), 'Extra', 'MULTIPLE', false, 'PER_TOPPING', 0, true,
    array['abababab-0000-0000-0000-000000000002']::uuid[]
  )$$,
  'owner can remove a category assignment'
);
select ok((
  select not option_group.is_visible
  from public.option_groups as option_group
  where option_group.product_id = 'abababab-0000-0000-0000-000000000005'
    and option_group.topping_group_id = (select group_id from reusable_topping_context)
), 'removed category stops exposing its materialized group');

select * from finish();
rollback;
