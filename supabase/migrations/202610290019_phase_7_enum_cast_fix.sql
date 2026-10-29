begin;

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
      status = case when recipients = 0
        then 'NO_RECIPIENT'::public.report_run_status else 'QUEUED'::public.report_run_status end,
      completed_at = case when recipients = 0 then now() else null end
  where id = run_id;
  return run_id;
end;
$$;

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

revoke execute on function app_private.enqueue_line_report(uuid, public.line_report_type, uuid, timestamptz, timestamptz, text)
  from public, anon, authenticated;
revoke execute on function public.register_line_subscription_message(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.register_line_subscription_message(text, text, text, text) to service_role;

commit;
