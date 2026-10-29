begin;

create extension if not exists pgtap with schema extensions;
select plan(3);

select ok(
  has_function_privilege('authenticated', 'public.save_shop_location(uuid,numeric,numeric)', 'EXECUTE'),
  'authenticated users can call owner-checked location RPC'
);
select ok(
  not has_function_privilege('anon', 'public.save_shop_location(uuid,numeric,numeric)', 'EXECUTE'),
  'anonymous users cannot update shop location'
);
select ok(
  not has_table_privilege('authenticated', 'public.shop_locations', 'UPDATE'),
  'shop location cannot be updated directly'
);

select * from finish();
rollback;
