begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

select has_function(
  'app_private',
  'protect_own_membership',
  array[]::text[],
  'self-membership protection trigger function exists'
);
select ok(
  exists (
    select 1
    from pg_catalog.pg_trigger as trigger
    join pg_catalog.pg_class as relation on relation.oid = trigger.tgrelid
    join pg_catalog.pg_namespace as relation_namespace on relation_namespace.oid = relation.relnamespace
    join pg_catalog.pg_proc as procedure on procedure.oid = trigger.tgfoid
    join pg_catalog.pg_namespace as procedure_namespace on procedure_namespace.oid = procedure.pronamespace
    where relation_namespace.nspname = 'public'
      and relation.relname = 'shop_members'
      and trigger.tgname = 'protect_own_membership'
      and procedure_namespace.nspname = 'app_private'
      and procedure.proname = 'protect_own_membership'
      and not trigger.tgisinternal
  ),
  'shop membership changes are guarded against self-revocation'
);
select ok(
  has_function_privilege('authenticated', 'public.create_shop_from_grant(text,text,text)', 'EXECUTE'),
  'authenticated users can call the server-authorized shop creation RPC'
);
select ok(
  not has_function_privilege('anon', 'public.create_shop_from_grant(text,text,text)', 'EXECUTE'),
  'anonymous users cannot create shops'
);

select * from finish();
rollback;
