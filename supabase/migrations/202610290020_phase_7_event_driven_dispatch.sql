begin;

create table public.notification_dispatch_signals (
  id bigint generated always as identity primary key,
  dedupe_key text not null unique check (char_length(dedupe_key) between 1 and 200),
  reason text not null check (reason in ('NEW_REPORT', 'DUE_RETRY')),
  created_at timestamptz not null default now()
);

comment on table public.notification_dispatch_signals is
  'Event-only outbox. A Database Webhook on INSERT invokes the LINE worker; no polling worker is kept alive.';

alter table public.notification_dispatch_signals enable row level security;
revoke all on table public.notification_dispatch_signals from anon, authenticated;
revoke all on sequence public.notification_dispatch_signals_id_seq from anon, authenticated;

create index notification_settings_periodic_enabled_idx
  on public.notification_settings (shop_id) where periodic_report_enabled;

create or replace function app_private.signal_line_worker_for_new_job()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_dispatch_signals (dedupe_key, reason)
  values ('report:' || new.report_run_id::text, 'NEW_REPORT')
  on conflict (dedupe_key) do nothing;
  return new;
end;
$$;

create trigger signal_line_worker_after_job_insert
after insert on public.notification_jobs
for each row execute function app_private.signal_line_worker_for_new_job();

create or replace function public.enqueue_due_line_retry_signal(requested_at timestamptz default now())
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted boolean;
begin
  if not exists (
    select 1 from public.notification_jobs as job
    where (job.status in ('PENDING', 'RETRY') and job.next_attempt_at <= requested_at)
      or (job.status = 'PROCESSING' and job.updated_at < requested_at - interval '10 minutes')
    limit 1
  ) then
    return false;
  end if;

  insert into public.notification_dispatch_signals (dedupe_key, reason)
  values ('retry:' || to_char(date_trunc('minute', requested_at), 'YYYYMMDDHH24MI'), 'DUE_RETRY')
  on conflict (dedupe_key) do nothing
  returning true into inserted;
  return coalesce(inserted, false);
end;
$$;

revoke execute on function app_private.signal_line_worker_for_new_job() from public, anon, authenticated;
revoke execute on function public.enqueue_due_line_retry_signal(timestamptz) from public, anon, authenticated;
grant execute on function public.enqueue_due_line_retry_signal(timestamptz) to service_role;

commit;

