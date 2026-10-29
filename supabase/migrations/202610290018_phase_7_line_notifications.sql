begin;

create type public.line_subscription_status as enum ('PENDING', 'APPROVED', 'REVOKED');
create type public.line_report_type as enum ('CLOSING', 'PERIODIC');
create type public.report_run_status as enum ('QUEUED', 'SENDING', 'SENT', 'PARTIAL', 'FAILED', 'NO_RECIPIENT');
create type public.notification_job_status as enum ('PENDING', 'PROCESSING', 'RETRY', 'SENT', 'DEAD');

create table public.line_subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  line_user_id text not null check (char_length(line_user_id) between 1 and 128),
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 120),
  status public.line_subscription_status not null default 'PENDING',
  requested_at timestamptz not null default now(),
  approved_by uuid references public.user_profiles(id) on delete set null,
  approved_at timestamptz,
  revoked_by uuid references public.user_profiles(id) on delete set null,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint line_subscriptions_shop_user_unique unique (shop_id, line_user_id),
  constraint line_subscriptions_status_consistent check (
    (status = 'PENDING' and approved_at is null and revoked_at is null)
    or (status = 'APPROVED' and approved_at is not null and revoked_at is null)
    or (status = 'REVOKED' and revoked_at is not null)
  )
);

create table public.notification_settings (
  shop_id uuid primary key references public.shops(id) on delete restrict,
  closing_report_enabled boolean not null default true,
  periodic_report_enabled boolean not null default false,
  report_times time without time zone[] not null default '{}'::time[],
  updated_by uuid references public.user_profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint notification_settings_report_times_limit check (cardinality(report_times) <= 6),
  constraint notification_settings_periodic_times check (
    not periodic_report_enabled or cardinality(report_times) > 0
  )
);

create table public.sales_report_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  report_type public.line_report_type not null,
  store_session_id uuid references public.store_sessions(id) on delete restrict,
  period_started_at timestamptz not null,
  period_ended_at timestamptz not null,
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status public.report_run_status not null default 'QUEUED',
  recipient_count integer not null default 0 check (recipient_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0 and sent_count <= recipient_count),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint sales_report_runs_period_valid check (period_ended_at >= period_started_at),
  constraint sales_report_runs_shop_key_unique unique (shop_id, idempotency_key)
);

create table public.notification_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  report_run_id uuid not null references public.sales_report_runs(id) on delete restrict,
  subscription_id uuid not null references public.line_subscriptions(id) on delete restrict,
  status public.notification_job_status not null default 'PENDING',
  attempts integer not null default 0 check (attempts between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_jobs_run_subscription_unique unique (report_run_id, subscription_id)
);

create table public.line_webhook_events (
  event_id text primary key check (char_length(event_id) between 1 and 160),
  event_type text not null check (char_length(event_type) between 1 and 40),
  received_at timestamptz not null default now()
);

create index line_subscriptions_shop_status_idx on public.line_subscriptions (shop_id, status, requested_at desc);
create index sales_report_runs_shop_created_idx on public.sales_report_runs (shop_id, created_at desc, id desc);
create index notification_jobs_due_idx on public.notification_jobs (next_attempt_at, created_at)
  where status in ('PENDING', 'RETRY', 'PROCESSING');
create index notification_jobs_run_status_idx on public.notification_jobs (report_run_id, status);

alter table public.line_subscriptions enable row level security;
alter table public.notification_settings enable row level security;
alter table public.sales_report_runs enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.line_webhook_events enable row level security;

revoke all on table public.line_subscriptions, public.notification_settings,
  public.sales_report_runs, public.notification_jobs, public.line_webhook_events
  from anon, authenticated;

create or replace function app_private.build_line_report_payload(
  target_shop_id uuid,
  selected_report_type public.line_report_type,
  target_store_session_id uuid,
  range_started_at timestamptz,
  range_ended_at timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with shop_context as (
    select shop.id, shop.name, shop.timezone,
      coalesce(session.business_date, timezone(shop.timezone, range_ended_at)::date) as business_date,
      session.opened_at, session.closed_at
    from public.shops as shop
    left join public.store_sessions as session on session.id = target_store_session_id and session.shop_id = shop.id
    where shop.id = target_shop_id
  ), cumulative_orders as materialized (
    select orders.*
    from public.orders as orders
    join shop_context on true
    where orders.shop_id = target_shop_id
      and (
        (target_store_session_id is not null and orders.store_session_id = target_store_session_id)
        or (target_store_session_id is null and orders.business_date = shop_context.business_date)
      )
      and orders.created_at <= range_ended_at
  ), delta_orders as materialized (
    select * from cumulative_orders where created_at > range_started_at
  ), cumulative_payments as materialized (
    select payment.* from public.payments as payment
    join cumulative_orders as orders on orders.id = payment.order_id
    where payment.status = 'PAID' and payment.paid_at <= range_ended_at
  ), delta_payments as materialized (
    select payment.* from cumulative_payments as payment where payment.paid_at > range_started_at
  ), cumulative as (
    select
      (select count(*)::integer from cumulative_orders where status <> 'CANCELLED') as order_count,
      (select count(*)::integer from cumulative_orders where status = 'CANCELLED') as cancelled_count,
      coalesce((select sum(paid_amount_satang) from cumulative_payments), 0)::bigint as collected,
      coalesce((select sum(paid_amount_satang) from cumulative_payments where method = 'CASH'), 0)::bigint as cash,
      coalesce((select sum(paid_amount_satang) from cumulative_payments where method = 'BANK_TRANSFER'), 0)::bigint as transfer
  ), delta as (
    select
      (select count(*)::integer from delta_orders where status <> 'CANCELLED') as order_count,
      coalesce((select sum(paid_amount_satang) from delta_payments), 0)::bigint as collected,
      coalesce((select sum(paid_amount_satang) from delta_payments where method = 'CASH'), 0)::bigint as cash,
      coalesce((select sum(paid_amount_satang) from delta_payments where method = 'BANK_TRANSFER'), 0)::bigint as transfer
  ), best_products as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', ranked.product_name,
      'quantity', ranked.quantity
    ) order by ranked.quantity desc, ranked.product_name), '[]'::jsonb) as payload
    from (
      select item.product_name, sum(item.quantity)::integer as quantity
      from public.order_items as item
      join cumulative_orders as orders on orders.id = item.order_id
      where orders.status <> 'CANCELLED' and orders.payment_status = 'PAID'
      group by item.product_name
      order by quantity desc, item.product_name
      limit 5
    ) as ranked
  )
  select jsonb_build_object(
    'shopId', shop_context.id,
    'shopName', shop_context.name,
    'timezone', shop_context.timezone,
    'reportType', selected_report_type,
    'businessDate', shop_context.business_date,
    'openedAt', shop_context.opened_at,
    'closedAt', shop_context.closed_at,
    'periodStartedAt', range_started_at,
    'periodEndedAt', range_ended_at,
    'cumulative', jsonb_build_object(
      'collectedSatang', cumulative.collected,
      'orderCount', cumulative.order_count,
      'cashSatang', cumulative.cash,
      'transferSatang', cumulative.transfer,
      'cancelledCount', cumulative.cancelled_count
    ),
    'delta', jsonb_build_object(
      'collectedSatang', delta.collected,
      'orderCount', delta.order_count,
      'cashSatang', delta.cash,
      'transferSatang', delta.transfer
    ),
    'bestSellingProducts', best_products.payload
  )
  from shop_context cross join cumulative cross join delta cross join best_products;
$$;

create or replace function app_private.enqueue_line_report(
  target_shop_id uuid,
  selected_report_type public.line_report_type,
  target_store_session_id uuid,
  range_started_at timestamptz,
  range_ended_at timestamptz,
  report_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_id uuid;
  recipients integer;
begin
  insert into public.sales_report_runs (
    shop_id, report_type, store_session_id, period_started_at, period_ended_at,
    idempotency_key, payload
  ) values (
    target_shop_id, selected_report_type, target_store_session_id, range_started_at, range_ended_at,
    report_key, app_private.build_line_report_payload(
      target_shop_id, selected_report_type, target_store_session_id, range_started_at, range_ended_at
    )
  )
  on conflict (shop_id, idempotency_key) do nothing
  returning id into run_id;

  if run_id is null then
    select id into run_id from public.sales_report_runs
    where shop_id = target_shop_id and idempotency_key = report_key;
    return run_id;
  end if;

  insert into public.notification_jobs (report_run_id, subscription_id)
  select run_id, subscription.id
  from public.line_subscriptions as subscription
  where subscription.shop_id = target_shop_id and subscription.status = 'APPROVED';
  get diagnostics recipients = row_count;

  update public.sales_report_runs
  set recipient_count = recipients,
      status = case when recipients = 0 then 'NO_RECIPIENT'::public.report_run_status else 'QUEUED'::public.report_run_status end,
      completed_at = case when recipients = 0 then now() else null end
  where id = run_id;
  return run_id;
end;
$$;

create or replace function app_private.enqueue_closing_line_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  enabled boolean;
begin
  select coalesce(settings.closing_report_enabled, true) into enabled
  from (select 1) as seed
  left join public.notification_settings as settings on settings.shop_id = new.shop_id;
  if enabled then
    perform app_private.enqueue_line_report(
      new.shop_id, 'CLOSING', new.id, new.opened_at, new.closed_at,
      'closing:' || new.id::text
    );
  end if;
  return new;
end;
$$;

create trigger enqueue_closing_line_report_after_close
after update of status on public.store_sessions
for each row when (old.status = 'OPEN' and new.status = 'CLOSED')
execute function app_private.enqueue_closing_line_report();

create or replace function public.register_line_subscription_message(
  webhook_event_id text,
  requester_line_user_id text,
  requester_display_name text,
  submitted_shop_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  parsed_shop_id uuid;
  subscription public.line_subscriptions;
begin
  insert into public.line_webhook_events (event_id, event_type)
  values (webhook_event_id, 'SUBSCRIPTION_REQUEST')
  on conflict do nothing;
  if not found then return jsonb_build_object('code', 'DUPLICATE'); end if;

  begin parsed_shop_id := btrim(submitted_shop_id)::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('code', 'INVALID_SHOP');
  end;
  if not exists (select 1 from public.shops where id = parsed_shop_id) then
    return jsonb_build_object('code', 'INVALID_SHOP');
  end if;

  insert into public.line_subscriptions (
    shop_id, line_user_id, display_name, status, requested_at,
    approved_by, approved_at, revoked_by, revoked_at, updated_at
  ) values (
    parsed_shop_id, requester_line_user_id, nullif(btrim(requester_display_name), ''),
    'PENDING', now(), null, null, null, null, now()
  )
  on conflict (shop_id, line_user_id) do update set
    display_name = coalesce(excluded.display_name, public.line_subscriptions.display_name),
    status = case when public.line_subscriptions.status = 'APPROVED'
      then 'APPROVED'::public.line_subscription_status else 'PENDING'::public.line_subscription_status end,
    requested_at = now(),
    approved_by = case when public.line_subscriptions.status = 'APPROVED' then public.line_subscriptions.approved_by else null end,
    approved_at = case when public.line_subscriptions.status = 'APPROVED' then public.line_subscriptions.approved_at else null end,
    revoked_by = null,
    revoked_at = null,
    updated_at = now()
  returning * into subscription;

  return jsonb_build_object('code', subscription.status::text, 'shopName', (
    select name from public.shops where id = parsed_shop_id
  ));
end;
$$;

create or replace function public.get_line_notification_management(target_shop_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app_private.require_sales_owner(target_shop_id);
  return jsonb_build_object(
    'shopId', target_shop_id,
    'settings', coalesce((
      select jsonb_build_object(
        'closingReportEnabled', settings.closing_report_enabled,
        'periodicReportEnabled', settings.periodic_report_enabled,
        'reportTimes', coalesce((select jsonb_agg(to_char(value, 'HH24:MI') order by value) from unnest(settings.report_times) as value), '[]'::jsonb)
      ) from public.notification_settings as settings where settings.shop_id = target_shop_id
    ), jsonb_build_object('closingReportEnabled', true, 'periodicReportEnabled', false, 'reportTimes', '[]'::jsonb)),
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', subscription.id,
        'displayName', subscription.display_name,
        'lineUserHint', '***' || right(subscription.line_user_id, 6),
        'status', subscription.status,
        'requestedAt', subscription.requested_at,
        'approvedAt', subscription.approved_at
      ) order by subscription.requested_at desc)
      from public.line_subscriptions as subscription where subscription.shop_id = target_shop_id
    ), '[]'::jsonb),
    'runs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', run.id,
        'reportType', run.report_type,
        'status', run.status,
        'recipientCount', run.recipient_count,
        'sentCount', run.sent_count,
        'createdAt', run.created_at,
        'completedAt', run.completed_at,
        'lastError', (select job.last_error from public.notification_jobs as job where job.report_run_id = run.id and job.last_error is not null order by job.updated_at desc limit 1)
      ) order by run.created_at desc)
      from (select * from public.sales_report_runs where shop_id = target_shop_id order by created_at desc limit 50) as run
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.update_line_notification_settings(
  target_shop_id uuid,
  enable_closing_report boolean,
  enable_periodic_report boolean,
  selected_report_times text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized time[];
  raw_time text;
begin
  perform app_private.require_sales_owner(target_shop_id);
  if cardinality(selected_report_times) > 6 then
    raise exception using errcode = '22023', message = 'A maximum of 6 report times is allowed.';
  end if;
  foreach raw_time in array coalesce(selected_report_times, '{}'::text[]) loop
    if raw_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      raise exception using errcode = '22023', message = 'Report time must use HH:MM format.';
    end if;
  end loop;
  select coalesce(array_agg(distinct value::time order by value::time), '{}'::time[]) into normalized
  from unnest(coalesce(selected_report_times, '{}'::text[])) as value;
  if enable_periodic_report and cardinality(normalized) = 0 then
    raise exception using errcode = '22023', message = 'At least one periodic report time is required.';
  end if;

  insert into public.notification_settings (
    shop_id, closing_report_enabled, periodic_report_enabled, report_times, updated_by
  ) values (target_shop_id, enable_closing_report, enable_periodic_report, normalized, auth.uid())
  on conflict (shop_id) do update set
    closing_report_enabled = excluded.closing_report_enabled,
    periodic_report_enabled = excluded.periodic_report_enabled,
    report_times = excluded.report_times,
    updated_by = auth.uid(),
    updated_at = now();
  insert into public.audit_logs (shop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_shop_id, auth.uid(), 'LINE_SETTINGS_UPDATED', 'notification_settings', target_shop_id,
    jsonb_build_object('closingEnabled', enable_closing_report, 'periodicEnabled', enable_periodic_report, 'reportTimes', normalized));
  return public.get_line_notification_management(target_shop_id);
end;
$$;

create or replace function public.set_line_subscription_status(
  target_shop_id uuid,
  target_subscription_id uuid,
  next_status public.line_subscription_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_sales_owner(target_shop_id);
  if next_status not in ('APPROVED', 'REVOKED') then
    raise exception using errcode = '22023', message = 'Owner can only approve or revoke subscriptions.';
  end if;
  update public.line_subscriptions set
    status = next_status,
    approved_by = case when next_status = 'APPROVED' then auth.uid() else approved_by end,
    approved_at = case when next_status = 'APPROVED' then now() else approved_at end,
    revoked_by = case when next_status = 'REVOKED' then auth.uid() else null end,
    revoked_at = case when next_status = 'REVOKED' then now() else null end,
    updated_at = now()
  where id = target_subscription_id and shop_id = target_shop_id;
  if not found then raise exception using errcode = 'P0002', message = 'LINE subscription not found.'; end if;
  insert into public.audit_logs (shop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_shop_id, auth.uid(), 'LINE_SUBSCRIPTION_' || next_status::text, 'line_subscription', target_subscription_id, '{}'::jsonb);
end;
$$;

create or replace function public.enqueue_due_periodic_line_reports(requested_at timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  setting record;
  local_date date;
  local_time text;
  period_start timestamptz;
  queued integer := 0;
begin
  for setting in
    select settings.*, shop.timezone from public.notification_settings as settings
    join public.shops as shop on shop.id = settings.shop_id
    where settings.periodic_report_enabled
  loop
    local_date := timezone(setting.timezone, requested_at)::date;
    local_time := to_char(timezone(setting.timezone, requested_at), 'HH24:MI');
    if not exists (select 1 from unnest(setting.report_times) as value where to_char(value, 'HH24:MI') = local_time) then
      continue;
    end if;
    select coalesce(max(run.period_ended_at), local_date::timestamp at time zone setting.timezone)
    into period_start
    from public.sales_report_runs as run
    where run.shop_id = setting.shop_id and run.report_type = 'PERIODIC'
      and timezone(setting.timezone, run.period_ended_at)::date = local_date;
    perform app_private.enqueue_line_report(
      setting.shop_id, 'PERIODIC', null, period_start, requested_at,
      'periodic:' || local_date::text || ':' || replace(local_time, ':', '')
    );
    queued := queued + 1;
  end loop;
  return queued;
end;
$$;

create or replace function public.claim_line_notification_jobs(batch_size integer default 10)
returns table (job_id uuid, line_user_id text, report_type public.line_report_type, payload jsonb)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if batch_size < 1 or batch_size > 50 then
    raise exception using errcode = '22023', message = 'Batch size must be between 1 and 50.';
  end if;
  return query
  with due as (
    select job.id from public.notification_jobs as job
    where (
      job.status in ('PENDING', 'RETRY') and job.next_attempt_at <= now()
    ) or (
      job.status = 'PROCESSING' and job.updated_at < now() - interval '10 minutes'
    )
    order by job.next_attempt_at, job.created_at
    for update skip locked
    limit batch_size
  ), claimed as (
    update public.notification_jobs as job
    set status = 'PROCESSING', attempts = job.attempts + 1, last_attempt_at = now(), updated_at = now()
    from due where job.id = due.id
    returning job.*
  )
  select claimed.id, subscription.line_user_id, run.report_type, run.payload
  from claimed
  join public.line_subscriptions as subscription on subscription.id = claimed.subscription_id
  join public.sales_report_runs as run on run.id = claimed.report_run_id;
end;
$$;

create or replace function public.complete_line_notification_job(
  target_job_id uuid,
  delivered boolean,
  delivery_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_job public.notification_jobs;
  run_id uuid;
  total integer;
  sent integer;
  terminal integer;
begin
  select * into target_job from public.notification_jobs where id = target_job_id for update;
  if target_job.id is null then raise exception using errcode = 'P0002', message = 'Notification job not found.'; end if;
  update public.notification_jobs set
    status = case when delivered then 'SENT'::public.notification_job_status
      when attempts >= 5 then 'DEAD'::public.notification_job_status else 'RETRY'::public.notification_job_status end,
    next_attempt_at = case when delivered or attempts >= 5 then next_attempt_at
      else now() + case attempts when 1 then interval '1 minute' when 2 then interval '5 minutes'
        when 3 then interval '15 minutes' else interval '60 minutes' end end,
    last_error = case when delivered then null else left(coalesce(delivery_error, 'LINE delivery failed.'), 1000) end,
    sent_at = case when delivered then now() else null end,
    updated_at = now()
  where id = target_job_id
  returning report_run_id into run_id;

  select count(*), count(*) filter (where status = 'SENT'), count(*) filter (where status in ('SENT', 'DEAD'))
  into total, sent, terminal from public.notification_jobs where report_run_id = run_id;
  update public.sales_report_runs set
    sent_count = sent,
    status = case when terminal < total then 'SENDING'::public.report_run_status
      when sent = total then 'SENT'::public.report_run_status
      when sent > 0 then 'PARTIAL'::public.report_run_status else 'FAILED'::public.report_run_status end,
    completed_at = case when terminal = total then now() else null end
  where id = run_id;
end;
$$;

revoke execute on function app_private.build_line_report_payload(uuid, public.line_report_type, uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function app_private.enqueue_line_report(uuid, public.line_report_type, uuid, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke execute on function app_private.enqueue_closing_line_report() from public, anon, authenticated;
revoke execute on function public.register_line_subscription_message(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.enqueue_due_periodic_line_reports(timestamptz) from public, anon, authenticated;
revoke execute on function public.claim_line_notification_jobs(integer) from public, anon, authenticated;
revoke execute on function public.complete_line_notification_job(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.register_line_subscription_message(text, text, text, text) to service_role;
grant execute on function public.enqueue_due_periodic_line_reports(timestamptz) to service_role;
grant execute on function public.claim_line_notification_jobs(integer) to service_role;
grant execute on function public.complete_line_notification_job(uuid, boolean, text) to service_role;

revoke execute on function public.get_line_notification_management(uuid) from public, anon;
revoke execute on function public.update_line_notification_settings(uuid, boolean, boolean, text[]) from public, anon;
revoke execute on function public.set_line_subscription_status(uuid, uuid, public.line_subscription_status) from public, anon;
grant execute on function public.get_line_notification_management(uuid) to authenticated;
grant execute on function public.update_line_notification_settings(uuid, boolean, boolean, text[]) to authenticated;
grant execute on function public.set_line_subscription_status(uuid, uuid, public.line_subscription_status) to authenticated;

commit;
