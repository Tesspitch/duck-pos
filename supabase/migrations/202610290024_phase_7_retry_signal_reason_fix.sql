begin;

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

  insert into public.notification_dispatch_signals (reason, dedupe_key)
  values ('DUE_RETRY', 'retry:' || to_char(date_trunc('minute', requested_at), 'YYYYMMDDHH24MI'))
  on conflict (dedupe_key) do nothing
  returning true into inserted;
  return coalesce(inserted, false);
end;
$$;

revoke execute on function public.enqueue_due_line_retry_signal(timestamptz) from public, anon, authenticated;
grant execute on function public.enqueue_due_line_retry_signal(timestamptz) to service_role;

commit;
