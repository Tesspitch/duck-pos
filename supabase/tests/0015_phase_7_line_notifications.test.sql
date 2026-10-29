begin;

create extension if not exists pgtap with schema extensions;
create temporary table phase7_tap_results (result text) on commit drop;
insert into phase7_tap_results select plan(29);

insert into phase7_tap_results select has_table('public', 'line_subscriptions', 'line subscriptions table exists');
insert into phase7_tap_results select has_table('public', 'notification_settings', 'notification settings table exists');
insert into phase7_tap_results select has_table('public', 'sales_report_runs', 'sales report runs table exists');
insert into phase7_tap_results select has_table('public', 'notification_jobs', 'notification jobs table exists');
insert into phase7_tap_results select has_table('public', 'line_webhook_events', 'LINE webhook events table exists');
insert into phase7_tap_results select has_function('public', 'get_line_notification_management', array['uuid']);
insert into phase7_tap_results select has_function('public', 'update_line_notification_settings', array['uuid', 'boolean', 'boolean', 'text[]']);
insert into phase7_tap_results select has_function('public', 'set_line_subscription_status', array['uuid', 'uuid', 'line_subscription_status']);
insert into phase7_tap_results select ok(has_function_privilege('authenticated', 'public.get_line_notification_management(uuid)', 'EXECUTE'), 'authenticated can call owner-checked management RPC');
insert into phase7_tap_results select ok(not has_function_privilege('anon', 'public.get_line_notification_management(uuid)', 'EXECUTE'), 'anonymous cannot read LINE management');
insert into phase7_tap_results select ok(not has_function_privilege('authenticated', 'public.register_line_subscription_message(text,text,text,text)', 'EXECUTE'), 'frontend cannot forge webhook requests');
insert into phase7_tap_results select ok(has_function_privilege('service_role', 'public.register_line_subscription_message(text,text,text,text)', 'EXECUTE'), 'service role can process signed webhook requests');

create temporary table line_test_context on commit drop as
select user_id from public.shop_members where status = 'ACTIVE' and role = 'OWNER' order by created_at limit 1;

insert into public.shops (id, name, timezone, created_by)
select 'eeeeeeee-0000-0000-0000-000000000001', 'LINE Test Shop', 'Asia/Bangkok', user_id from line_test_context;
insert into public.shop_members (shop_id, user_id, role, status, granted_by)
select 'eeeeeeee-0000-0000-0000-000000000001', user_id, 'OWNER', 'ACTIVE', user_id from line_test_context;

insert into phase7_tap_results select is(
  (public.register_line_subscription_message('line-test-invalid', 'U-test-1', 'Test User', 'not-a-uuid')->>'code'),
  'INVALID_SHOP', 'invalid Shop ID is rejected'
);
insert into phase7_tap_results select is(
  (public.register_line_subscription_message('line-test-valid', 'U-test-1', 'Test User', 'eeeeeeee-0000-0000-0000-000000000001')->>'code'),
  'PENDING', 'valid request starts pending'
);
insert into phase7_tap_results select is((select count(*)::integer from public.line_subscriptions where shop_id = 'eeeeeeee-0000-0000-0000-000000000001'), 1, 'one subscription request is stored');
insert into phase7_tap_results select is(
  (public.register_line_subscription_message('line-test-valid', 'U-test-1', 'Test User', 'eeeeeeee-0000-0000-0000-000000000001')->>'code'),
  'DUPLICATE', 'webhook event is deduplicated'
);

select set_config('request.jwt.claims', jsonb_build_object(
  'sub', (select user_id from line_test_context), 'role', 'authenticated'
)::text, true);

insert into phase7_tap_results select lives_ok(
  $$select public.update_line_notification_settings('eeeeeeee-0000-0000-0000-000000000001', true, true, array['12:00', '18:00'])$$,
  'owner updates LINE report settings'
);
insert into phase7_tap_results select is(
  (select cardinality(report_times) from public.notification_settings where shop_id = 'eeeeeeee-0000-0000-0000-000000000001'),
  2, 'periodic report times are stored'
);
insert into phase7_tap_results select lives_ok(
  $$select public.set_line_subscription_status(
    'eeeeeeee-0000-0000-0000-000000000001',
    (select id from public.line_subscriptions where shop_id = 'eeeeeeee-0000-0000-0000-000000000001'),
    'APPROVED'
  )$$,
  'owner approves a subscriber'
);
insert into phase7_tap_results select is((select status::text from public.line_subscriptions where shop_id = 'eeeeeeee-0000-0000-0000-000000000001'), 'APPROVED', 'subscriber becomes approved');

insert into public.store_sessions (id, shop_id, business_date, opened_at, opened_by)
select 'eeeeeeee-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000001', '2026-10-29', '2026-10-29 08:00+07', user_id from line_test_context;
insert into phase7_tap_results select is((select count(*)::integer from public.sales_report_runs where report_type = 'OPENING' and shop_id = 'eeeeeeee-0000-0000-0000-000000000001'), 1, 'opening creates one notification run');
insert into phase7_tap_results select is((select (payload->'cumulative'->>'collectedSatang')::bigint from public.sales_report_runs where report_type = 'OPENING' and shop_id = 'eeeeeeee-0000-0000-0000-000000000001'), 0::bigint, 'opening payload starts with zero sales');
update public.store_sessions set status = 'CLOSED', closed_at = '2026-10-29 20:00+07', closed_by = (select user_id from line_test_context)
where id = 'eeeeeeee-0000-0000-0000-000000000002';

insert into phase7_tap_results select is((select count(*)::integer from public.sales_report_runs where report_type = 'CLOSING' and shop_id = 'eeeeeeee-0000-0000-0000-000000000001'), 1, 'closing creates one report run');
insert into phase7_tap_results select is((select (payload->'cumulative'->>'collectedSatang')::bigint from public.sales_report_runs where report_type = 'CLOSING' and shop_id = 'eeeeeeee-0000-0000-0000-000000000001'), 0::bigint, 'closing report keeps zero-sales sessions');
insert into phase7_tap_results select is((select count(*)::integer from public.notification_jobs where report_run_id in (
  select id from public.sales_report_runs where shop_id = 'eeeeeeee-0000-0000-0000-000000000001'
)), 2, 'opening and closing create jobs for the approved subscriber');

create temporary table claimed_line_job on commit drop as
select * from public.claim_line_notification_jobs(10);
insert into phase7_tap_results select is((
  select count(*)::integer from claimed_line_job as claimed
  join public.notification_jobs as job on job.id = claimed.job_id
  join public.sales_report_runs as run on run.id = job.report_run_id
  where run.shop_id = 'eeeeeeee-0000-0000-0000-000000000001'
), 2, 'worker atomically claims the due jobs');
insert into phase7_tap_results select lives_ok(
  $$select public.complete_line_notification_job((
    select claimed.job_id from claimed_line_job as claimed
    join public.notification_jobs as job on job.id = claimed.job_id
    join public.sales_report_runs as run on run.id = job.report_run_id
    where run.shop_id = 'eeeeeeee-0000-0000-0000-000000000001' and claimed.report_type = 'CLOSING'
  ), true, null)$$,
  'worker records successful delivery'
);
insert into phase7_tap_results select is((select status::text from public.sales_report_runs where report_type = 'CLOSING' and shop_id = 'eeeeeeee-0000-0000-0000-000000000001'), 'SENT', 'report run is marked sent');

select public.enqueue_due_periodic_line_reports('2026-10-29 12:00+07');
select public.enqueue_due_periodic_line_reports('2026-10-29 12:00+07');
insert into phase7_tap_results select is((select count(*)::integer from public.sales_report_runs where report_type = 'PERIODIC' and shop_id = 'eeeeeeee-0000-0000-0000-000000000001'), 1, 'periodic report is idempotent per scheduled minute');

insert into phase7_tap_results select * from finish();
select * from phase7_tap_results;
rollback;
