begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

select has_table('public', 'categories', 'categories table exists');
select has_table('public', 'products', 'products table exists');
select has_table('public', 'option_groups', 'option_groups table exists');
select has_table('public', 'product_options', 'product_options table exists');

select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.categories'::regclass), 'RLS enabled on categories');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.products'::regclass), 'RLS enabled on products');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.option_groups'::regclass), 'RLS enabled on option_groups');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.product_options'::regclass), 'RLS enabled on product_options');

select ok(not has_table_privilege('anon', 'public.categories', 'SELECT'), 'anonymous cannot list categories before Phase 3 public API');
select ok(not has_table_privilege('anon', 'public.products', 'SELECT'), 'anonymous cannot list products before Phase 3 public API');
select ok(not has_table_privilege('anon', 'public.option_groups', 'SELECT'), 'anonymous cannot list option groups before Phase 3 public API');
select ok(not has_table_privilege('anon', 'public.product_options', 'SELECT'), 'anonymous cannot list product options before Phase 3 public API');

select ok(not has_table_privilege('authenticated', 'public.categories', 'INSERT'), 'authenticated cannot insert categories directly');
select ok(not has_table_privilege('authenticated', 'public.products', 'UPDATE'), 'authenticated cannot update products directly');
select ok(not has_table_privilege('authenticated', 'public.option_groups', 'DELETE'), 'authenticated cannot delete option groups directly');
select ok(not has_table_privilege('authenticated', 'public.product_options', 'UPDATE'), 'authenticated cannot update options directly');

select ok(has_function_privilege('authenticated', 'public.save_product(uuid,uuid,uuid,text,text,integer,integer,boolean,boolean,text)', 'EXECUTE'), 'authenticated can call owner-checked product command');
select ok(has_function_privilege('authenticated', 'public.set_product_availability(uuid,uuid,boolean)', 'EXECUTE'), 'authenticated can call member-checked availability command');
select ok(not has_function_privilege('anon', 'public.save_product(uuid,uuid,uuid,text,text,integer,integer,boolean,boolean,text)', 'EXECUTE'), 'anonymous cannot call product command');
select ok(not has_function_privilege('anon', 'public.set_product_availability(uuid,uuid,boolean)', 'EXECUTE'), 'anonymous cannot change availability');

select ok(
  exists (
    select 1 from storage.buckets
    where id = 'product-images'
      and public = true
      and file_size_limit = 5242880
  ),
  'public product image bucket has a 5 MB upload limit'
);

select * from finish();
rollback;
