begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

select has_type('public', 'shop_role', 'shop_role enum exists');
select has_type('public', 'membership_status', 'membership_status enum exists');
select has_table('public', 'user_profiles', 'user_profiles table exists');
select has_table('public', 'shops', 'shops table exists');
select has_table('public', 'shop_members', 'shop_members table exists');
select has_table('public', 'shop_locations', 'shop_locations table exists');
select has_table('public', 'audit_logs', 'audit_logs table exists');

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.user_profiles'::regclass),
  'RLS is enabled on user_profiles'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.shops'::regclass),
  'RLS is enabled on shops'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.shop_members'::regclass),
  'RLS is enabled on shop_members'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.shop_locations'::regclass),
  'RLS is enabled on shop_locations'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.audit_logs'::regclass),
  'RLS is enabled on audit_logs'
);

select ok(
  not has_table_privilege('anon', 'public.shops', 'SELECT'),
  'anonymous clients cannot read shops'
);
select ok(
  not has_table_privilege('anon', 'public.shop_members', 'SELECT'),
  'anonymous clients cannot read shop memberships'
);
select ok(
  not has_table_privilege('authenticated', 'public.shop_members', 'INSERT'),
  'authenticated clients cannot insert memberships directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.shop_members', 'UPDATE'),
  'authenticated clients cannot update memberships directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.shop_members', 'DELETE'),
  'authenticated clients cannot delete memberships directly'
);

select function_privs_are(
  'public',
  'grant_shop_member',
  array['uuid', 'uuid', 'shop_role'],
  'authenticated',
  array['EXECUTE'],
  'only authenticated callers can execute grant_shop_member'
);

select function_privs_are(
  'public',
  'revoke_shop_member',
  array['uuid', 'uuid'],
  'authenticated',
  array['EXECUTE'],
  'only authenticated callers can execute revoke_shop_member'
);

select * from finish();
rollback;

