begin;
create extension if not exists pgtap with schema extensions;
create temporary table feature_tap(result text) on commit drop;
insert into feature_tap select no_plan();
create temporary table feature_context(actor uuid, staff_shop uuid, owner_shop uuid, staff_session uuid, owner_session uuid, staff_order uuid, paid_order uuid, pending_order uuid, day date, fp text) on commit drop;

do $$
declare
  a uuid; ss uuid:=gen_random_uuid(); os uuid:=gen_random_uuid(); ssession uuid:=gen_random_uuid(); osession uuid:=gen_random_uuid();
  so uuid:=gen_random_uuid(); po uuid:=gen_random_uuid(); uo uuid:=gen_random_uuid(); day date:=current_date;
begin
  select user_id into strict a from public.shop_members where role='OWNER' and status='ACTIVE' limit 1;
  insert into public.shops(id,name,created_by) values(ss,'Staff close QA',a),(os,'Single delete QA',a);
  insert into public.shop_members(shop_id,user_id,role,status,granted_by) values(ss,a,'STAFF','ACTIVE',a),(os,a,'OWNER','ACTIVE',a);
  insert into public.store_sessions(id,shop_id,business_date,opened_by) values(ssession,ss,day,a);
  insert into public.store_sessions(id,shop_id,business_date,status,opened_by,closed_at,closed_by,accepting_orders)
    values(osession,os,day,'CLOSED',a,now(),a,false);
  insert into public.orders(id,shop_id,store_session_id,business_date,queue_number,order_reference,source,status,payment_status,subtotal_satang,total_satang,idempotency_key,tracking_token_hash)
    values(so,ss,ssession,day,1,'QA-STAFF-001','POS','QUEUED','UNPAID',3900,3900,gen_random_uuid(),repeat('1',64)),
      (po,os,osession,day,1,'QA-PAID-001','QR','COMPLETED','PAID',5900,5900,gen_random_uuid(),repeat('2',64)),
      (uo,os,osession,day,2,'QA-PENDING-001','QR','PREPARING','UNPAID',4900,4900,gen_random_uuid(),repeat('3',64));
  insert into public.payments(shop_id,order_id,method,paid_amount_satang,amount_received_satang,confirmed_by)
    values(os,po,'BANK_TRANSFER',5900,5900,a);
  insert into feature_context values(a,ss,os,ssession,osession,so,po,uo,day,null);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
end $$;

insert into feature_tap select ok(not has_function_privilege('anon','public.set_store_order_acceptance(uuid,uuid,boolean)','EXECUTE'),'anonymous cannot change order intake');
insert into feature_tap select lives_ok($$select public.set_store_order_acceptance((select staff_shop from feature_context),(select staff_session from feature_context),false)$$,'staff can pause new orders');
insert into feature_tap select is((select accepting_orders from public.store_sessions where id=(select staff_session from feature_context)),false,'session stays open but intake is paused');
insert into feature_tap select is(public.get_public_menu((select staff_shop from feature_context))->>'isOpen','false','public menu reports not accepting');
insert into feature_tap select is(public.list_active_staff_orders((select staff_shop from feature_context))->>'isOpen','false','POS reports not accepting');
insert into feature_tap select throws_ok($$insert into public.orders(shop_id,store_session_id,business_date,queue_number,order_reference,source,status,payment_status,subtotal_satang,total_satang,idempotency_key,tracking_token_hash)
  select staff_shop,staff_session,day,2,'QA-PAUSED-002','POS','QUEUED','UNPAID',100,100,gen_random_uuid(),repeat('4',64) from feature_context$$,'P0001','The shop is not accepting new orders.','paused intake rejects a new order atomically');
insert into feature_tap select is((select count(*)::integer from public.orders where id=(select staff_order from feature_context)),1,'existing queue survives intake pause');
insert into feature_tap select throws_ok($$select public.close_store_session((select staff_shop from feature_context),(select staff_session from feature_context))$$,'P0001','Pending or unpaid orders must be resolved before closing the store.','staff cannot close unresolved session');
update public.orders set status='CANCELLED' where id=(select staff_order from feature_context);
insert into feature_tap select lives_ok($$select public.close_store_session((select staff_shop from feature_context),(select staff_session from feature_context))$$,'staff can close a resolved session');
insert into feature_tap select is((select status::text from public.store_sessions where id=(select staff_session from feature_context)),'CLOSED','staff close ends session');
insert into feature_tap select is((select count(*)::integer from public.audit_logs where entity_id=(select staff_session from feature_context) and action in ('ORDER_INTAKE_PAUSED','STORE_CLOSED')),2,'intake and close actions are audited');

insert into feature_tap select is(public.preview_shop_order_deletion((select owner_shop from feature_context),(select paid_order from feature_context))->>'grossSatang','5900','single-order preview returns gross value');
insert into feature_tap select is(public.preview_shop_order_deletion((select owner_shop from feature_context),(select paid_order from feature_context))->>'collectedSatang','5900','single-order preview returns collected value');
insert into feature_tap select is(public.preview_shop_order_deletion((select owner_shop from feature_context),(select pending_order from feature_context))->>'blockedReason','RESOLVE_ORDER_FIRST','unfinished order cannot be erased');
update feature_context set fp=public.preview_shop_order_deletion(owner_shop,paid_order)->>'fingerprint';
insert into feature_tap select throws_ok($$select public.delete_shop_order_history((select owner_shop from feature_context),(select paid_order from feature_context),'stale','Single delete QA')$$,'40001','History changed. Preview again before deleting.','stale single-order preview rejected');
insert into feature_tap select lives_ok($$select public.delete_shop_order_history((select owner_shop from feature_context),(select paid_order from feature_context),(select fp from feature_context),'Single delete QA')$$,'owner deletes one settled order');
insert into feature_tap select is((select count(*)::integer from public.orders where id=(select paid_order from feature_context)),0,'selected order physically deleted');
insert into feature_tap select is((select count(*)::integer from public.orders where id=(select pending_order from feature_context)),1,'unselected order remains');
insert into feature_tap select is(public.get_sales_dashboard((select owner_shop from feature_context),current_date,current_date)->>'grossOrderValueSatang','4900','dashboard decreases by deleted order only');
insert into feature_tap select is((select count(*)::integer from public.audit_logs where entity_id=(select paid_order from feature_context) and action='SALES_ORDER_HISTORY_DELETED'),1,'single-order deletion audited');

insert into feature_tap select * from finish();
select result from feature_tap;
rollback;
