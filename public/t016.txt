begin;

create extension if not exists pgtap with schema extensions;
create temporary table phase7_dispatch_results (result text) on commit drop;
insert into phase7_dispatch_results select plan(8);

insert into phase7_dispatch_results select has_table(
  'public', 'notification_dispatch_signals', 'dispatch signal outbox exists'
);
insert into phase7_dispatch_results select has_function(
  'public', 'enqueue_due_line_retry_signal', array['timestamptz']
);
insert into phase7_dispatch_results select ok(
  not has_function_privilege('authenticated', 'public.enqueue_due_line_retry_signal(timestamptz)', 'EXECUTE'),
  'frontend cannot create retry dispatch signals'
);

create temporary table dispatch_context on commit drop as
select user_id from public.shop_members where status = 'ACTIVE' and role = 'OWNER' order by created_at limit 1;
insert into public.shops (id, name, timezone, created_by)
select 'ffffffff-0000-0000-0000-000000000001', 'Dispatch Test Shop', 'Asia/Bangkok', user_id from dispatch_context;
insert into public.shop_members (shop_id, user_id, role, status, granted_by)
select 'ffffffff-0000-0000-0000-000000000001', user_id, 'OWNER', 'ACTIVE', user_id from dispatch_context;
insert into public.line_subscriptions (id, shop_id, line_user_id, display_name, status, approved_by, approved_at)
select 'ffffffff-0000-0000-0000-000000000002', 'ffffffff-0000-0000-0000-000000000001', 'U-dispatch', 'Dispatch User', 'APPROVED', user_id, now() from dispatch_context;
insert into public.sales_report_runs (
  id, shop_id, report_type, period_started_at, period_ended_at, idempotency_key, payload, recipient_count
) values (
  'ffffffff-0000-0000-0000-000000000003', 'ffffffff-0000-0000-0000-000000000001', 'PERIODIC', now() - interval '1 hour', now(), 'dispatch-test', '{}'::jsonb, 1
);
insert into public.notification_jobs (id, report_run_id, subscription_id)
values ('ffffffff-0000-0000-0000-000000000004', 'ffffffff-0000-0000-0000-000000000003', 'ffffffff-0000-0000-0000-000000000002');

insert into phase7_dispatch_results select is(
  (select count(*)::integer from public.notification_dispatch_signals where reason = 'NEW_REPORT'),
  1, 'new report creates one dispatch signal'
);
insert into public.notification_jobs (id, report_run_id, subscription_id)
values ('ffffffff-0000-0000-0000-000000000005', 'ffffffff-0000-0000-0000-000000000003', 'ffffffff-0000-0000-0000-000000000002')
on conflict (report_run_id, subscription_id) do nothing;
insert into phase7_dispatch_results select is(
  (select count(*)::integer from public.notification_dispatch_signals where reason = 'NEW_REPORT'),
  1, 'report signal is deduplicated'
);
insert into phase7_dispatch_results select is(
  public.enqueue_due_line_retry_signal(now()), false, 'empty retry queue does not create a signal'
);
update public.notification_jobs set status = 'RETRY', attempts = 1, next_attempt_at = now() - interval '1 minute'
where id = 'ffffffff-0000-0000-0000-000000000004';
insert into phase7_dispatch_results select is(
  public.enqueue_due_line_retry_signal('2026-10-29 12:00+07'), true, 'due retry creates a signal'
);
insert into phase7_dispatch_results select is(
  public.enqueue_due_line_retry_signal('2026-10-29 12:00+07'), false, 'retry signal is deduplicated per minute'
);

insert into phase7_dispatch_results select * from finish();
select * from phase7_dispatch_results;
rollback;
