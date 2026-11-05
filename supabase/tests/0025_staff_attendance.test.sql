begin;
create extension if not exists pgtap with schema extensions;
create temporary table attendance_tap(result text) on commit drop;
insert into attendance_tap select no_plan();
create temporary table attendance_context(owner_id uuid,staff_id uuid,shop uuid,other_shop uuid,entry uuid,day date);
do $$
declare a uuid; employee uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); other_s uuid:=gen_random_uuid(); e uuid:=gen_random_uuid();
begin
  select user_id into strict a from public.shop_members where role='OWNER' and status='ACTIVE' limit 1;
  insert into auth.users(id,email) values(employee,'attendance-qa-'||employee||'@example.test');
  insert into public.user_profiles(id,display_name) values(employee,'QA Employee') on conflict(id) do update set display_name='QA Employee';
  insert into public.shops(id,name,created_by) values(s,'Attendance QA',a),(other_s,'Other attendance QA',a);
  insert into public.shop_locations(shop_id,latitude,longitude) values(s,16,103),(other_s,16,103);
  insert into public.shop_members(shop_id,user_id,role,granted_by) values(s,a,'OWNER',a),(s,employee,'STAFF',a),(other_s,employee,'STAFF',a);
  insert into public.staff_time_entries(id,shop_id,user_id,clocked_in_at,clocked_out_at)
    values(e,s,employee,'2026-10-31 22:00+07','2026-11-01 02:00+07');
  insert into attendance_context values(a,employee,s,other_s,e,'2026-10-31');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
end $$;
insert into attendance_tap select is(public.get_staff_hours_report((select shop from attendance_context),'2026-10-31','2026-11-01')->>'totalSeconds','14400','overnight shift totals four hours');
insert into attendance_tap select is(public.get_staff_hours_report((select shop from attendance_context),'2026-10-31','2026-11-01')->>'totalCount','2','shift split into two calendar days');
insert into attendance_tap select is(public.get_staff_hours_report((select shop from attendance_context),'2026-10-31','2026-10-31')->>'totalSeconds','7200','first day clipped at midnight');
insert into attendance_tap select is(public.get_staff_hours_report((select shop from attendance_context),'2026-11-01','2026-11-01')->>'totalSeconds','7200','second day keeps remaining hours');
insert into attendance_tap select is(public.get_staff_hours_report((select shop from attendance_context),'2026-10-31','2026-11-01','MONTH')->>'totalCount','2','month boundary separated');
insert into attendance_tap select is(public.get_staff_hours_report((select shop from attendance_context),'2026-10-31','2026-11-01','WEEK')->'rows'->0->>'period','2026-10-26','week begins Monday');
insert into attendance_tap select is(public.get_staff_hours_report((select shop from attendance_context),'2026-10-31','2026-11-01','DAY',1,1)->>'totalCount','2','pagination retains total count');
insert into attendance_tap select throws_ok($$select public.get_staff_hours_report((select shop from attendance_context),'2026-11-02','2026-10-01')$$,'22023','Start date must not be after end date.','reversed dates rejected');
insert into attendance_tap select ok(not has_table_privilege('authenticated','public.staff_time_entries','INSERT'),'direct inserts denied');
insert into attendance_tap select ok(not has_table_privilege('authenticated','public.staff_time_entries','UPDATE'),'direct timestamp edits denied');
insert into attendance_tap select ok(not has_function_privilege('anon','public.clock_in_staff(uuid,double precision,double precision,double precision,timestamptz)','EXECUTE'),'anonymous cannot clock in');
insert into attendance_tap select throws_ok($$select public.clock_in_staff((select other_shop from attendance_context),16,103,10,now())$$,'42501','Active shop membership is required.','other shop membership checked');

-- Employee can only see their own report and cannot close someone else's entry.
insert into public.staff_time_entries(shop_id,user_id,clocked_in_at,clocked_out_at)
  select shop,owner_id,'2026-10-31 10:00+07','2026-10-31 11:00+07' from attendance_context;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select staff_id from attendance_context),'role','authenticated')::text,true);
grant select on attendance_context to authenticated;
grant insert,select on attendance_tap to authenticated;
set local role authenticated;
insert into attendance_tap select is(public.get_staff_hours_report((select shop from attendance_context),'2026-10-31','2026-11-01')->>'totalSeconds','14400','staff report excludes owner hours');
insert into attendance_tap select is((select count(*)::integer from public.staff_time_entries where shop_id=(select shop from attendance_context)),1,'RLS excludes other employee entries');
insert into attendance_tap select lives_ok($$select public.clock_in_staff((select shop from attendance_context),16,103,10,now())$$,'staff clocks in own shift');
insert into attendance_tap select throws_ok($$select public.clock_in_staff((select other_shop from attendance_context),16,103,10,now())$$,'P0001','Already clocked in. Clock out before starting another shift.','cross-branch duplicate clock-in blocked');
insert into attendance_tap select is(public.get_my_attendance()->'activeEntry'->>'shopId',(select shop::text from attendance_context),'current attendance restored across sessions');
reset role;
insert into attendance_tap select throws_ok($$select public.clock_out_staff((select id from public.staff_time_entries where user_id=(select owner_id from attendance_context) limit 1))$$,'P0002','Time entry not found.','cannot clock out another person');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select owner_id from attendance_context),'role','authenticated')::text,true);
update public.shop_members set status='REVOKED',revoked_at=now(),revoked_by=(select owner_id from attendance_context)
  where shop_id=(select shop from attendance_context) and user_id=(select staff_id from attendance_context);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select staff_id from attendance_context),'role','authenticated')::text,true);
insert into attendance_tap select lives_ok($$select public.clock_out_staff((public.get_my_attendance()->'activeEntry'->>'id')::uuid)$$,'own clock-out allowed after membership revoked');
insert into attendance_tap select is(public.get_my_attendance()->'activeEntry','null'::jsonb,'clock-out clears active entry');
select set_config('request.jwt.claims',jsonb_build_object('sub',(select owner_id from attendance_context),'role','authenticated')::text,true);
insert into attendance_tap select is(public.get_staff_hours_report((select shop from attendance_context),'2026-10-31','2026-11-01')->>'totalSeconds','18000','owner sees all employee hours including former staff');
insert into attendance_tap select is((select count(*)::integer from public.audit_logs where shop_id=(select shop from attendance_context) and action in ('STAFF_CLOCKED_IN','STAFF_CLOCKED_OUT')),2,'clock actions audited');
insert into attendance_tap select * from finish();
select result from attendance_tap;
rollback;
