-- Authorization regression; all fixtures and sessions are rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select plan(1);
do $$
declare
  actor uuid;
  staff_shop uuid := gen_random_uuid();
  other_shop uuid := gen_random_uuid();
  revoked_shop uuid := gen_random_uuid();
  session_id uuid;
begin
  select user_id into strict actor from public.shop_members where role = 'OWNER' and status = 'ACTIVE' limit 1;
  insert into public.shops(id,name,timezone,created_by) values
    (staff_shop,'Staff authorization test','Asia/Bangkok',actor),
    (other_shop,'Other shop authorization test','Asia/Bangkok',actor),
    (revoked_shop,'Revoked authorization test','Asia/Bangkok',actor);
  insert into public.shop_members(shop_id,user_id,role,status,granted_by) values
    (staff_shop,actor,'STAFF','ACTIVE',actor);
  insert into public.shop_members(shop_id,user_id,role,status,granted_by,revoked_by,revoked_at) values
    (revoked_shop,actor,'STAFF','REVOKED',actor,actor,now());
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  perform public.open_store_session(staff_shop);
  select id into session_id from public.store_sessions where shop_id=staff_shop and status='OPEN';
  if session_id is null then raise exception 'STAFF could not open own shop'; end if;
  begin
    perform public.close_store_session(staff_shop,session_id);
    raise exception 'STAFF unexpectedly closed shop';
  exception when insufficient_privilege then null; end;
  begin
    perform public.open_store_session(other_shop);
    raise exception 'Cross-shop opening unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.open_store_session(revoked_shop);
    raise exception 'Revoked membership unexpectedly allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.open_store_session(staff_shop);
    raise exception 'Duplicate opening unexpectedly allowed';
  exception when unique_violation then null; end;
  if not exists(select 1 from public.audit_logs where entity_id=session_id and action='STORE_OPENED' and actor_user_id=actor) then
    raise exception 'Opening audit missing';
  end if;
end $$;
select pass('Staff opening, owner-only closing, shop isolation, revocation, duplicate guard and audit assertions passed');
select * from finish();
rollback;
