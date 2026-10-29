begin;

create extension if not exists pg_cron;

select cron.schedule(
  'duckpos-line-due-work',
  '* * * * *',
  $cron$
    select public.enqueue_due_periodic_line_reports(now());
    select public.enqueue_due_line_retry_signal(now());
  $cron$
);

commit;

