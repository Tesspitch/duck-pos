begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

select has_table('public', 'store_sessions', 'store sessions table exists');
select has_table('public', 'queue_counters', 'queue counters table exists');
select has_table('public', 'orders', 'orders table exists');
select has_table('public', 'order_items', 'order items table exists');
select has_table('public', 'order_item_options', 'order item options table exists');
select has_table('public', 'order_events', 'order events table exists');
select ok((select relrowsecurity from pg_catalog.pg_class where oid = 'public.orders'::regclass), 'RLS enabled on orders');
select ok(not has_table_privilege('anon', 'public.orders', 'SELECT'), 'anonymous cannot select orders');
select ok(not has_table_privilege('anon', 'public.order_items', 'SELECT'), 'anonymous cannot select order items');
select ok(not has_table_privilege('authenticated', 'public.orders', 'INSERT'), 'authenticated cannot insert orders directly');
select ok(
  exists (select 1 from pg_catalog.pg_constraint where conname = 'orders_shop_business_queue_unique'),
  'queue number is unique per shop and business date'
);
select ok(
  exists (select 1 from pg_catalog.pg_constraint where conname = 'orders_shop_idempotency_unique'),
  'idempotency key is unique per shop'
);
select ok(has_function_privilege('anon', 'public.get_public_menu(uuid)', 'EXECUTE'), 'anonymous can load public menu');
select ok(has_function_privilege('anon', 'public.track_order(uuid)', 'EXECUTE'), 'anonymous can track with secret token');
select ok(not has_function_privilege('anon', 'public.create_qr_order(uuid,uuid,uuid,double precision,double precision,double precision,timestamptz,jsonb,text)', 'EXECUTE'), 'anonymous cannot bypass checkout edge function');
select ok(has_function_privilege('service_role', 'public.create_qr_order(uuid,uuid,uuid,double precision,double precision,double precision,timestamptz,jsonb,text)', 'EXECUTE'), 'service role can execute checkout command');
select ok(not has_function_privilege('anon', 'public.consume_checkout_rate_limit(uuid,text,integer,integer)', 'EXECUTE'), 'anonymous cannot bypass rate limit');
select ok(has_function_privilege('service_role', 'public.consume_checkout_rate_limit(uuid,text,integer,integer)', 'EXECUTE'), 'service role can consume rate limit');
select function_returns('public', 'get_public_menu', array['uuid'], 'jsonb', 'public menu returns JSON');
select function_returns('public', 'track_order', array['uuid'], 'jsonb', 'tracking returns JSON');

select * from finish();
rollback;
