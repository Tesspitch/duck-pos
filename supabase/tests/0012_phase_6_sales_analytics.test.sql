begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

select has_function('public', 'get_sales_dashboard', array['uuid', 'date', 'date', 'uuid', 'text']);
select has_function('public', 'search_sales_history', array['uuid', 'date', 'date', 'uuid', 'order_source', 'order_status', 'payment_status', 'payment_method', 'text', 'text', 'integer', 'integer']);
select has_function('public', 'list_sales_sessions', array['uuid']);
select has_function('app_private', 'require_sales_owner', array['uuid']);
select has_function('app_private', 'validate_sales_range', array['date', 'date']);
select ok(has_function_privilege('authenticated', 'public.get_sales_dashboard(uuid,date,date,uuid,text)', 'EXECUTE'), 'authenticated can call owner-checked dashboard RPC');
select ok(not has_function_privilege('anon', 'public.get_sales_dashboard(uuid,date,date,uuid,text)', 'EXECUTE'), 'anonymous cannot call dashboard RPC');
select ok(has_function_privilege('authenticated', 'public.search_sales_history(uuid,date,date,uuid,public.order_source,public.order_status,public.payment_status,public.payment_method,text,text,integer,integer)', 'EXECUTE'), 'authenticated can call owner-checked history RPC');
select ok(not has_function_privilege('anon', 'public.search_sales_history(uuid,date,date,uuid,public.order_source,public.order_status,public.payment_status,public.payment_method,text,text,integer,integer)', 'EXECUTE'), 'anonymous cannot call history RPC');
select has_index('public', 'orders', 'orders_shop_business_date_created_idx', 'date report index exists');
select has_index('public', 'orders', 'orders_shop_session_created_idx', 'session report index exists');
select has_index('public', 'payments', 'payments_shop_status_method_idx', 'payment report index exists');

select * from finish();
rollback;
