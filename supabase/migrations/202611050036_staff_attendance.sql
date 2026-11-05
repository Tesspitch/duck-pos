begin;

create table public.staff_time_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  user_id uuid not null references public.user_profiles(id) on delete restrict,
  clocked_in_at timestamptz not null default now(),
  clocked_out_at timestamptz,
  constraint staff_time_entries_time_order check (clocked_out_at is null or clocked_out_at >= clocked_in_at)
);
-- One person cannot clock into two branches at the same time.
create unique index staff_time_entries_one_active_idx on public.staff_time_entries(user_id) where clocked_out_at is null;
create index staff_time_entries_shop_start_idx on public.staff_time_entries(shop_id,clocked_in_at);
create index staff_time_entries_shop_active_idx on public.staff_time_entries(shop_id) where clocked_out_at is null;
alter table public.staff_time_entries enable row level security;
revoke all on public.staff_time_entries from public,anon,authenticated;
grant select on public.staff_time_entries to authenticated;
create policy staff_time_entries_read on public.staff_time_entries for select to authenticated using (
  app_private.is_active_shop_member(shop_id) and (user_id=(select auth.uid()) or app_private.is_active_shop_member(shop_id,array['OWNER']::public.shop_role[]))
);

create function public.get_my_attendance()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('activeEntry',(
    select jsonb_build_object('id',e.id,'shopId',e.shop_id,'shopName',s.name,'clockedInAt',e.clocked_in_at)
    from public.staff_time_entries e join public.shops s on s.id=e.shop_id
    where e.user_id=auth.uid() and e.clocked_out_at is null
  ),'serverTime',now());
$$;

create function public.clock_in_staff(target_shop_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
  if not app_private.is_active_shop_member(target_shop_id) then
    raise exception using errcode='42501',message='Active shop membership is required.';
  end if;
  perform 1 from public.shops where id=target_shop_id and deleted_at is null for share;
  if not found then raise exception using errcode='P0001',message='Shop is unavailable.'; end if;
  -- Serialize retries/devices for this person.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,36));
  if exists(select 1 from public.staff_time_entries where user_id=auth.uid() and clocked_out_at is null) then
    raise exception using errcode='P0001',message='Already clocked in. Clock out before starting another shift.';
  end if;
  insert into public.staff_time_entries(shop_id,user_id) values(target_shop_id,auth.uid()) returning id into new_id;
  insert into public.audit_logs(shop_id,actor_user_id,action,entity_type,entity_id)
    values(target_shop_id,auth.uid(),'STAFF_CLOCKED_IN','staff_time_entry',new_id);
end;
$$;

create function public.clock_out_staff(expected_entry_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare target public.staff_time_entries;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='Authentication required.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,36));
  select * into target from public.staff_time_entries where id=expected_entry_id and user_id=auth.uid() for update;
  if target.id is null then raise exception using errcode='P0002',message='Time entry not found.'; end if;
  if target.clocked_out_at is not null then return; end if;
  -- The employee may finish an existing shift even after access was revoked.
  update public.staff_time_entries set clocked_out_at=greatest(now(),clocked_in_at) where id=target.id;
  insert into public.audit_logs(shop_id,actor_user_id,action,entity_type,entity_id)
    values(target.shop_id,auth.uid(),'STAFF_CLOCKED_OUT','staff_time_entry',target.id);
end;
$$;

create function public.get_staff_hours_report(
  target_shop_id uuid,date_from date,date_to date,bucket_unit text default 'DAY',
  page_number integer default 1,page_size integer default 50
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; shop_timezone text; is_owner boolean;
begin
  if not app_private.is_active_shop_member(target_shop_id) then
    raise exception using errcode='42501',message='Active shop membership is required.';
  end if;
  perform app_private.validate_sales_range(date_from,date_to);
  if bucket_unit is null or bucket_unit not in ('DAY','WEEK','MONTH') or page_number is null or page_number<1 or page_size is null or page_size not between 1 and 100 then
    raise exception using errcode='22023',message='Invalid attendance report parameters.';
  end if;
  select timezone into shop_timezone from public.shops where id=target_shop_id;
  is_owner:=app_private.is_active_shop_member(target_shop_id,array['OWNER']::public.shop_role[]);
  with entries as materialized (
    select e.*,greatest(e.clocked_in_at,date_from::timestamp at time zone shop_timezone) as start_at,
      least(coalesce(e.clocked_out_at,now()),(date_to+1)::timestamp at time zone shop_timezone) as end_at
    from public.staff_time_entries e where e.shop_id=target_shop_id
      and (is_owner or e.user_id=auth.uid())
      and e.clocked_in_at<(date_to+1)::timestamp at time zone shop_timezone
      and coalesce(e.clocked_out_at,now())>date_from::timestamp at time zone shop_timezone
  ), segments as (
    select e.id,e.user_id,e.clocked_out_at is null as is_live,
      d.day::date as local_day,
      greatest(e.start_at,d.day at time zone shop_timezone) as start_at,
      least(e.end_at,(d.day+interval '1 day') at time zone shop_timezone) as end_at
    from entries e cross join lateral generate_series(
      timezone(shop_timezone,e.start_at)::date::timestamp,
      timezone(shop_timezone,e.end_at)::date::timestamp,interval '1 day'
    ) d(day)
  ), grouped as (
    select date_trunc(lower(bucket_unit),local_day::timestamp)::date as period,user_id,
      sum(extract(epoch from end_at-start_at))::bigint as seconds,
      count(distinct id)::integer as shifts,bool_or(is_live) as is_live,
      min(start_at) as first_in,max(end_at) as last_out
    from segments where end_at>start_at group by 1,user_id
  ), paged as (
    select g.*,coalesce(nullif(p.display_name,''),'พนักงาน') as employee_name
    from grouped g left join public.user_profiles p on p.id=g.user_id
    order by period desc,employee_name,user_id limit page_size offset (page_number-1)::bigint*page_size
  )
  select jsonb_build_object(
    'timezone',shop_timezone,'serverTime',now(),'totalSeconds',coalesce((select sum(seconds) from grouped),0),
    'totalShifts',(select count(*) from entries where end_at>start_at),
    'activeShifts',(select count(*) from entries where clocked_out_at is null and end_at>start_at),
    'totalCount',(select count(*) from grouped),'page',page_number,'pageSize',page_size,
    'rows',coalesce((select jsonb_agg(jsonb_build_object(
      'period',period,'userId',user_id,'employeeName',employee_name,'seconds',seconds,
      'shifts',shifts,'isLive',is_live,'firstIn',first_in,'lastOut',last_out
    ) order by period desc,employee_name,user_id) from paged),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke execute on function public.get_my_attendance(),public.clock_in_staff(uuid),public.clock_out_staff(uuid),
  public.get_staff_hours_report(uuid,date,date,text,integer,integer) from public,anon;
grant execute on function public.get_my_attendance(),public.clock_in_staff(uuid),public.clock_out_staff(uuid),
  public.get_staff_hours_report(uuid,date,date,text,integer,integer) to authenticated;
commit;
