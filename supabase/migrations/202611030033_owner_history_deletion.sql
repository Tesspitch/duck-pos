begin;

-- Erasing sales must not let an old checkout request create the same order again.
create table app_private.deleted_order_receipts (
  shop_id uuid not null references public.shops(id) on delete restrict,
  idempotency_key uuid not null,
  deleted_at timestamptz not null default now(),
  primary key(shop_id,idempotency_key)
);
revoke all on app_private.deleted_order_receipts from public,anon,authenticated;
alter table app_private.deleted_order_receipts enable row level security;
create function app_private.reject_deleted_order_retry() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from app_private.deleted_order_receipts where shop_id=new.shop_id and idempotency_key=new.idempotency_key) then
    raise exception using errcode='P0001',message='This order history was deleted. Start a new order.';
  end if;
  return new;
end;
$$;
revoke all on function app_private.reject_deleted_order_retry() from public,anon,authenticated;
create trigger orders_reject_deleted_retry before insert on public.orders for each row execute function app_private.reject_deleted_order_retry();

-- Minimal run receipts retain idempotency/period checkpoints after delivery details are erased.
alter table public.sales_report_runs add column history_deleted_at timestamptz;
create index sales_report_runs_visible_shop_created_idx on public.sales_report_runs(shop_id,created_at desc)
  where history_deleted_at is null;

create function app_private.shop_history_deletion_preview(target_shop_id uuid, history_kind text, date_from date, date_to date)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; blocked text; selected_count integer; fingerprint text; gross bigint; collected bigint;
begin
  perform app_private.require_sales_owner(target_shop_id);
  perform app_private.validate_sales_range(date_from,date_to);
  if history_kind='SALES' then
    select count(*)::integer,
      coalesce(sum(o.total_satang) filter(where o.status<>'CANCELLED'),0),
      encode(extensions.digest(coalesce(string_agg(o.id::text||o.updated_at::text||coalesce(p.updated_at::text,''),',' order by o.id),''),'sha256'),'hex')
    into selected_count,gross,fingerprint
    from public.orders o left join public.payments p on p.order_id=o.id
    where o.shop_id=target_shop_id and o.business_date between date_from and date_to;
    select coalesce(sum(p.paid_amount_satang) filter(where p.status='PAID'),0) into collected
    from public.payments p join public.orders o on o.id=p.order_id
    where o.shop_id=target_shop_id and o.business_date between date_from and date_to;
    if exists(select 1 from public.store_sessions where shop_id=target_shop_id and business_date between date_from and date_to and status='OPEN') then
      blocked:='CLOSE_STORE_FIRST';
    elsif exists(select 1 from public.orders where shop_id=target_shop_id and business_date between date_from and date_to
      and (status in ('QUEUED','PREPARING','READY') or (status<>'CANCELLED' and payment_status='UNPAID'))) then
      blocked:='RESOLVE_ORDERS_FIRST';
    end if;
  elsif history_kind='NOTIFICATIONS' then
    select count(*)::integer,encode(extensions.digest(coalesce(string_agg(r.id::text||r.status::text||coalesce(r.completed_at::text,''),',' order by r.id),''),'sha256'),'hex')
    into selected_count,fingerprint from public.sales_report_runs r join public.shops s on s.id=r.shop_id
    where r.shop_id=target_shop_id and r.history_deleted_at is null
      and timezone(s.timezone,r.created_at)::date between date_from and date_to
      and r.status in ('SENT','PARTIAL','FAILED','NO_RECIPIENT')
      and not exists(select 1 from public.notification_jobs j where j.report_run_id=r.id and j.status in ('PENDING','PROCESSING','RETRY'));
    gross:=0; collected:=0;
  else raise exception using errcode='22023',message='Invalid history kind.';
  end if;
  if selected_count>5000 then blocked:='NARROW_DATE_RANGE'; end if;
  return jsonb_build_object('count',selected_count,'grossSatang',gross,'collectedSatang',collected,'fingerprint',fingerprint,'blockedReason',blocked);
end;
$$;
revoke all on function app_private.shop_history_deletion_preview(uuid,text,date,date) from public,anon,authenticated;

create function public.preview_shop_history_deletion(target_shop_id uuid, history_kind text, date_from date, date_to date)
returns jsonb language sql security definer set search_path='' as $$
  select app_private.shop_history_deletion_preview(target_shop_id,history_kind,date_from,date_to);
$$;

create function public.delete_shop_history(target_shop_id uuid, history_kind text, date_from date, date_to date, expected_fingerprint text, confirmation_name text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare preview jsonb; shop_name text; run_ids uuid[];
begin
  perform app_private.require_sales_owner(target_shop_id);
  perform app_private.validate_sales_range(date_from,date_to);
  select name into shop_name from public.shops where id=target_shop_id and deleted_at is null for update;
  if confirmation_name is distinct from shop_name or shop_name is null then
    raise exception using errcode='22023',message='Shop name confirmation does not match.';
  end if;
  if history_kind='SALES' then
    perform 1 from public.store_sessions where shop_id=target_shop_id and business_date between date_from and date_to order by id for update;
    perform 1 from public.orders where shop_id=target_shop_id and business_date between date_from and date_to order by id for update;
    perform 1 from public.payments p join public.orders o on o.id=p.order_id where o.shop_id=target_shop_id and o.business_date between date_from and date_to order by p.id for update of p;
  elsif history_kind='NOTIFICATIONS' then
    perform 1 from public.sales_report_runs r join public.shops s on s.id=r.shop_id
      where r.shop_id=target_shop_id and r.history_deleted_at is null and timezone(s.timezone,r.created_at)::date between date_from and date_to
      and r.status in ('SENT','PARTIAL','FAILED','NO_RECIPIENT') order by r.id for update of r;
  else raise exception using errcode='22023',message='Invalid history kind.';
  end if;
  preview:=app_private.shop_history_deletion_preview(target_shop_id,history_kind,date_from,date_to);
  if preview->>'blockedReason' is not null then raise exception using errcode='P0001',message=preview->>'blockedReason'; end if;
  if expected_fingerprint is distinct from preview->>'fingerprint' then
    raise exception using errcode='40001',message='History changed. Preview again before deleting.';
  end if;
  if (preview->>'count')::integer=0 then return preview; end if;
  if history_kind='SALES' then
    insert into app_private.deleted_order_receipts(shop_id,idempotency_key)
      select shop_id,idempotency_key from public.orders where shop_id=target_shop_id and business_date between date_from and date_to
      on conflict do nothing;
    delete from public.order_item_options opt using public.order_items i,public.orders o
      where opt.order_item_id=i.id and i.order_id=o.id and o.shop_id=target_shop_id and o.business_date between date_from and date_to;
    delete from public.order_items i using public.orders o where i.order_id=o.id and o.shop_id=target_shop_id and o.business_date between date_from and date_to;
    delete from public.order_events e using public.orders o where e.order_id=o.id and o.shop_id=target_shop_id and o.business_date between date_from and date_to;
    delete from public.payments p using public.orders o where p.order_id=o.id and o.shop_id=target_shop_id and o.business_date between date_from and date_to;
    delete from public.orders where shop_id=target_shop_id and business_date between date_from and date_to;
  else
    select array_agg(r.id) into run_ids from public.sales_report_runs r join public.shops s on s.id=r.shop_id
      where r.shop_id=target_shop_id and r.history_deleted_at is null and timezone(s.timezone,r.created_at)::date between date_from and date_to
      and r.status in ('SENT','PARTIAL','FAILED','NO_RECIPIENT')
      and not exists(select 1 from public.notification_jobs j where j.report_run_id=r.id and j.status in ('PENDING','PROCESSING','RETRY'));
    delete from public.notification_jobs where report_run_id=any(run_ids);
    update public.sales_report_runs set payload='{}'::jsonb,recipient_count=0,sent_count=0,history_deleted_at=now() where id=any(run_ids);
  end if;
  insert into public.audit_logs(shop_id,actor_user_id,action,entity_type,metadata)
    values(target_shop_id,auth.uid(),history_kind||'_HISTORY_DELETED','history',
      jsonb_build_object('dateFrom',date_from,'dateTo',date_to,'count',(preview->>'count')::integer));
  return preview;
end;
$$;
revoke all on function public.preview_shop_history_deletion(uuid,text,date,date),public.delete_shop_history(uuid,text,date,date,text,text) from public,anon;
grant execute on function public.preview_shop_history_deletion(uuid,text,date,date),public.delete_shop_history(uuid,text,date,date,text,text) to authenticated;

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
      from (select * from public.sales_report_runs where shop_id = target_shop_id and history_deleted_at is null order by created_at desc limit 50) as run
    ), '[]'::jsonb)
  );
end;
$$;
commit;
