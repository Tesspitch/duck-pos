begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

select has_type('public', 'payment_method', 'payment method enum exists');
select has_table('public', 'payments', 'payments table exists');
select col_type_is('public', 'payments', 'paid_amount_satang', 'integer', 'payment amount uses integer satang');
select col_is_fk('public', 'payments', 'order_id', 'payment references order');
select ok(
  exists (select 1 from pg_catalog.pg_constraint where conname = 'payments_order_unique'),
  'an order has at most one payment record'
);
select has_function('public', 'create_pos_order', array['uuid', 'uuid', 'jsonb', 'text']);
select has_function('public', 'list_active_staff_orders', array['uuid']);
select has_function('public', 'update_order_status', array['uuid', 'order_status', 'order_status', 'text']);
select has_function('public', 'record_order_payment', array['uuid', 'payment_method', 'integer']);
select ok(has_function_privilege('authenticated', 'public.create_pos_order(uuid,uuid,jsonb,text)', 'EXECUTE'), 'authenticated can call POS RPC');
select ok(not has_function_privilege('anon', 'public.create_pos_order(uuid,uuid,jsonb,text)', 'EXECUTE'), 'anonymous cannot call POS RPC');
select ok(not has_table_privilege('authenticated', 'public.payments', 'INSERT'), 'staff cannot insert payments directly');
select ok(not has_table_privilege('authenticated', 'public.orders', 'UPDATE'), 'staff cannot update orders directly');
select ok(
  exists (select 1 from pg_catalog.pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'),
  'orders are published to realtime'
);
select ok(
  exists (select 1 from pg_catalog.pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payments'),
  'payments are published to realtime'
);
select policies_are('public', 'payments', array['payments_select_member'], 'payments use member-only RLS policy');

select * from finish();
rollback;

