begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

select has_type(
  'public',
  'shop_creation_grant_status',
  'shop creation grant status enum exists'
);
select has_table('public', 'platform_admins', 'platform_admins table exists');
select has_table('public', 'shop_creation_grants', 'shop_creation_grants table exists');

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.platform_admins'::regclass),
  'RLS is enabled on platform_admins'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.shop_creation_grants'::regclass),
  'RLS is enabled on shop_creation_grants'
);

select ok(
  not has_table_privilege('anon', 'public.platform_admins', 'SELECT'),
  'anonymous clients cannot read platform admins'
);
select ok(
  not has_table_privilege('anon', 'public.shop_creation_grants', 'SELECT'),
  'anonymous clients cannot read shop creation grants'
);
select ok(
  not has_table_privilege('authenticated', 'public.shop_creation_grants', 'INSERT'),
  'authenticated clients cannot insert grants directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.shop_creation_grants', 'UPDATE'),
  'authenticated clients cannot update grants directly'
);

select ok(
  has_function_privilege('authenticated', 'public.grant_shop_creation(uuid)', 'EXECUTE'),
  'authenticated role can call grant RPC, which performs its own admin check'
);
select ok(
  not has_function_privilege('anon', 'public.grant_shop_creation(uuid)', 'EXECUTE'),
  'anonymous role cannot call grant RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.create_shop_from_grant(text,text,text)', 'EXECUTE'),
  'authenticated role can call shop creation RPC'
);
select ok(
  not has_function_privilege('anon', 'public.create_shop_from_grant(text,text,text)', 'EXECUTE'),
  'anonymous role cannot call shop creation RPC'
);

select * from finish();
rollback;

