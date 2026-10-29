alter type public.line_report_type add value if not exists 'OPENING' before 'CLOSING';

begin;

update public.notification_settings
set closing_report_enabled = true,
    updated_at = now()
where not closing_report_enabled;

create or replace function app_private.enqueue_opening_line_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.enqueue_line_report(
    new.shop_id, 'OPENING', new.id, new.opened_at, new.opened_at,
    'opening:' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists enqueue_opening_line_report_after_open on public.store_sessions;
create trigger enqueue_opening_line_report_after_open
after insert on public.store_sessions
for each row when (new.status = 'OPEN')
execute function app_private.enqueue_opening_line_report();

create or replace function app_private.enqueue_closing_line_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.enqueue_line_report(
    new.shop_id, 'CLOSING', new.id, new.opened_at, new.closed_at,
    'closing:' || new.id::text
  );
  return new;
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
  ) values (target_shop_id, true, enable_periodic_report, normalized, auth.uid())
  on conflict (shop_id) do update set
    closing_report_enabled = true,
    periodic_report_enabled = excluded.periodic_report_enabled,
    report_times = excluded.report_times,
    updated_by = auth.uid(),
    updated_at = now();
  insert into public.audit_logs (shop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_shop_id, auth.uid(), 'LINE_SETTINGS_UPDATED', 'notification_settings', target_shop_id,
    jsonb_build_object('closingEnabled', true, 'periodicEnabled', enable_periodic_report, 'reportTimes', normalized));
  return public.get_line_notification_management(target_shop_id);
end;
$$;

revoke execute on function app_private.enqueue_opening_line_report() from public, anon, authenticated;

commit;
