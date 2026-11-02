begin;
create extension if not exists pgtap with schema extensions;
create temporary table deletion_tap(result text) on commit drop;
insert into deletion_tap select no_plan();
create temporary table deletion_context(actor uuid,shop uuid,staff_shop uuid,session uuid,order_id uuid,item_id uuid,run_id uuid,live_run uuid,other_order uuid,d date,fp text) on commit drop;
do $$
declare a uuid; s uuid:=gen_random_uuid(); other_s uuid:=gen_random_uuid(); ss uuid:=gen_random_uuid(); oss uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); oo uuid:=gen_random_uuid(); i uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); g uuid:=gen_random_uuid(); opt uuid:=gen_random_uuid(); r uuid:=gen_random_uuid(); lr uuid:=gen_random_uuid(); sub uuid:=gen_random_uuid(); day date:=current_date-2;
begin
  select user_id into strict a from public.shop_members where role='OWNER' and status='ACTIVE' limit 1;
  insert into public.shops(id,name,created_by) values(s,'Deletion QA',a),(other_s,'Other deletion QA',a);
  insert into public.shop_members(shop_id,user_id,role,granted_by) values(s,a,'OWNER',a),(other_s,a,'STAFF',a);
  insert into public.store_sessions(id,shop_id,business_date,status,opened_at,opened_by,closed_at,closed_by)
    values(ss,s,day,'CLOSED',day::timestamp,a,day::timestamp+interval '1 hour',a),(oss,other_s,day,'CLOSED',day::timestamp,a,day::timestamp+interval '1 hour',a);
  insert into public.categories(id,shop_id,name) values(c,s,'QA');
  insert into public.products(id,shop_id,category_id,name,base_price_satang) values(p,s,c,'QA food',3900);
  insert into public.option_groups(id,shop_id,product_id,name) values(g,s,p,'QA size');
  insert into public.product_options(id,shop_id,option_group_id,name) values(opt,s,g,'M');
  insert into public.orders(id,shop_id,store_session_id,business_date,queue_number,order_reference,source,status,payment_status,subtotal_satang,total_satang,idempotency_key,tracking_token_hash)
    values(o,s,ss,day,1,'QA-DELETE-001','QR','COMPLETED','PAID',3900,3900,gen_random_uuid(),encode(extensions.digest(o::text,'sha256'),'hex')),
    (oo,other_s,oss,day,1,'QA-OTHER-001','POS','COMPLETED','PAID',3900,3900,gen_random_uuid(),encode(extensions.digest(oo::text,'sha256'),'hex'));
  insert into public.order_items(id,order_id,product_id,product_name,unit_price_satang,quantity,line_total_satang) values(i,o,p,'QA food',3900,1,3900);
  insert into public.order_item_options(order_item_id,product_option_id,option_name,price_delta_satang) values(i,opt,'M',0);
  insert into public.order_events(order_id,shop_id,to_status) values(o,s,'COMPLETED');
  insert into public.payments(shop_id,order_id,method,paid_amount_satang,amount_received_satang,confirmed_by) values(s,o,'BANK_TRANSFER',3900,3900,a);
  insert into public.queue_counters(shop_id,business_date,last_number) values(s,day,10);
  insert into public.line_subscriptions(id,shop_id,line_user_id,status,approved_at) values(sub,s,'QA-only-subscriber','APPROVED',now());
  insert into public.sales_report_runs(id,shop_id,report_type,store_session_id,period_started_at,period_ended_at,idempotency_key,payload,status,recipient_count,sent_count,completed_at)
    values(r,s,'CLOSING',ss,day::timestamp,day::timestamp+interval '1 hour','closing:'||ss,'{"private":"summary"}','SENT',1,1,now()),
    (lr,s,'PERIODIC',ss,day::timestamp,day::timestamp+interval '1 hour','qa-pending','{}','QUEUED',1,0,null);
  insert into public.notification_jobs(report_run_id,subscription_id,status) values(r,sub,'SENT'),(lr,sub,'PENDING');
  insert into deletion_context values(a,s,other_s,ss,o,i,r,lr,oo,day,null);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
end $$;

-- Same-shop records outside the selected period must survive.
insert into public.store_sessions(id,shop_id,business_date,status,opened_at,opened_by,closed_at,closed_by)
  select gen_random_uuid(),shop,d-1,'CLOSED',(d-1)::timestamp,actor,(d-1)::timestamp+interval '1 hour',actor from deletion_context;
insert into public.orders(shop_id,store_session_id,business_date,queue_number,order_reference,source,status,payment_status,subtotal_satang,total_satang,idempotency_key,tracking_token_hash)
  select c.shop,s.id,c.d-1,1,'QA-OUTSIDE-001','QR','CANCELLED','UNPAID',3900,3900,gen_random_uuid(),repeat('b',64)
  from deletion_context c join public.store_sessions s on s.shop_id=c.shop and s.business_date=c.d-1;
insert into deletion_tap select ok(not has_function_privilege('anon','public.delete_shop_history(uuid,text,date,date,text,text)','EXECUTE'),'anonymous role has no deletion permission');
insert into deletion_tap select ok(not has_table_privilege('authenticated','app_private.deleted_order_receipts','SELECT'),'minimal checkout receipts are private');

insert into deletion_tap select throws_ok($$select public.preview_shop_history_deletion((select staff_shop from deletion_context),'SALES',current_date-2,current_date-2)$$,'42501','Only an active shop owner can view sales reports.','staff cannot preview deletion');
insert into deletion_tap select throws_ok($$select public.delete_shop_history((select staff_shop from deletion_context),'SALES',current_date-2,current_date-2,'x','Other deletion QA')$$,'42501','Only an active shop owner can view sales reports.','staff cannot delete history');
insert into deletion_tap select throws_ok($$select public.preview_shop_history_deletion((select shop from deletion_context),'SALES',current_date,current_date-2)$$,'22023','Start date must not be after end date.','reversed dates rejected');
insert into deletion_tap select is(public.preview_shop_history_deletion((select shop from deletion_context),'SALES',current_date-2,current_date-2)->>'count','1','preview counts selected shop orders');
insert into deletion_tap select is(public.preview_shop_history_deletion((select shop from deletion_context),'SALES',current_date-2,current_date-2)->>'grossSatang','3900','preview sales amount');
insert into deletion_tap select is(public.preview_shop_history_deletion((select shop from deletion_context),'SALES',current_date-2,current_date-2)->>'collectedSatang','3900','preview actual collected amount');
update deletion_context set fp=public.preview_shop_history_deletion(shop,'SALES',d,d)->>'fingerprint';
insert into deletion_tap select throws_ok($$select public.delete_shop_history((select shop from deletion_context),'SALES',current_date-2,current_date-2,(select fp from deletion_context),'Wrong shop')$$,'22023','Shop name confirmation does not match.','wrong shop name prevents deletion');
insert into deletion_tap select throws_ok($$select public.delete_shop_history((select shop from deletion_context),'SALES',current_date-2,current_date-2,'stale','Deletion QA')$$,'40001','History changed. Preview again before deleting.','stale preview cannot delete');
update public.orders set payment_status='UNPAID' where id=(select order_id from deletion_context);
insert into deletion_tap select is(public.preview_shop_history_deletion((select shop from deletion_context),'SALES',current_date-2,current_date-2)->>'blockedReason','RESOLVE_ORDERS_FIRST','unpaid completed order blocks deletion');
update public.orders set payment_status='PAID',status='PREPARING' where id=(select order_id from deletion_context);
insert into deletion_tap select is(public.preview_shop_history_deletion((select shop from deletion_context),'SALES',current_date-2,current_date-2)->>'blockedReason','RESOLVE_ORDERS_FIRST','paid preparing order blocks deletion');
update public.orders set status='COMPLETED' where id=(select order_id from deletion_context);
-- Rollback-only direct session state change avoids dispatching LINE events.
alter table public.store_sessions disable trigger user;
update public.store_sessions set status='OPEN',closed_at=null,closed_by=null where id=(select session from deletion_context);
insert into deletion_tap select is(public.preview_shop_history_deletion((select shop from deletion_context),'SALES',current_date-2,current_date-2)->>'blockedReason','CLOSE_STORE_FIRST','open session blocks deletion');
update public.store_sessions set status='CLOSED',closed_at=now(),closed_by=(select actor from deletion_context) where id=(select session from deletion_context);
alter table public.store_sessions enable trigger user;
update deletion_context set fp=public.preview_shop_history_deletion(shop,'SALES',d,d)->>'fingerprint';
grant select on deletion_context to authenticated;
grant insert,select on deletion_tap to authenticated;
set local role authenticated;
insert into deletion_tap select lives_ok($$select public.delete_shop_history((select shop from deletion_context),'SALES',current_date-2,current_date-2,(select fp from deletion_context),'Deletion QA')$$,'owner can delete selected settled sales through real role');
reset role;
insert into deletion_tap select is((select count(*)::integer from public.orders where id=(select order_id from deletion_context)),0,'order physically deleted');
insert into deletion_tap select is((select count(*)::integer from public.payments where order_id=(select order_id from deletion_context)),0,'payment physically deleted');
insert into deletion_tap select is((select count(*)::integer from public.order_items where id=(select item_id from deletion_context)),0,'order items physically deleted');
insert into deletion_tap select is((select count(*)::integer from public.order_item_options where order_item_id=(select item_id from deletion_context)),0,'option snapshots physically deleted');
insert into deletion_tap select is((select count(*)::integer from public.order_events where order_id=(select order_id from deletion_context)),0,'order events physically deleted');
insert into deletion_tap select is((select count(*)::integer from public.orders where id=(select other_order from deletion_context)),1,'other shop order preserved');
insert into deletion_tap select is((select count(*)::integer from public.orders where shop_id=(select shop from deletion_context) and business_date=current_date-3),1,'same shop sales outside selected dates preserved');
insert into deletion_tap select is((select last_number from public.queue_counters where shop_id=(select shop from deletion_context) and business_date=current_date-2),10,'queue counter never resets');
insert into deletion_tap select throws_ok($$insert into public.orders(shop_id,store_session_id,business_date,queue_number,order_reference,source,status,payment_status,subtotal_satang,total_satang,idempotency_key,tracking_token_hash)
  select shop,session,d,11,'QA-RETRY-001','QR','QUEUED','UNPAID',3900,3900,(select idempotency_key from app_private.deleted_order_receipts where shop_id=shop limit 1),repeat('a',64) from deletion_context$$,'P0001','This order history was deleted. Start a new order.','erased checkout cannot be replayed to create a duplicate sale');
insert into deletion_tap select is((select count(*)::integer from public.store_sessions where id=(select session from deletion_context)),1,'session history retained');
insert into deletion_tap select is(public.get_sales_dashboard((select shop from deletion_context),current_date-2,current_date-2)->>'grossOrderValueSatang','0','sales dashboard updates to zero after actual deletion');
insert into deletion_tap select is(public.track_order((select order_id from deletion_context)),null::jsonb,'deleted tracking token no longer resolves');
insert into deletion_tap select is((select count(*)::integer from public.audit_logs where shop_id=(select shop from deletion_context) and action='SALES_HISTORY_DELETED'),1,'deletion audit retained');

insert into deletion_tap select is(public.preview_shop_history_deletion((select shop from deletion_context),'NOTIFICATIONS',current_date-1,current_date+1)->>'count','1','notification preview excludes pending work');
update deletion_context set fp=public.preview_shop_history_deletion(shop,'NOTIFICATIONS',current_date-1,current_date+1)->>'fingerprint';
insert into deletion_tap select lives_ok($$select public.delete_shop_history((select shop from deletion_context),'NOTIFICATIONS',current_date-1,current_date+1,(select fp from deletion_context),'Deletion QA')$$,'owner erases finished notification details');
insert into deletion_tap select is((select count(*)::integer from public.notification_jobs where report_run_id=(select run_id from deletion_context)),0,'delivery job details physically deleted');
insert into deletion_tap select is((select payload from public.sales_report_runs where id=(select run_id from deletion_context)),'{}'::jsonb,'report payload erased');
insert into deletion_tap select ok((select history_deleted_at is not null from public.sales_report_runs where id=(select run_id from deletion_context)),'minimal dedupe receipt retained');
insert into deletion_tap select is((select count(*)::integer from public.notification_jobs where report_run_id=(select live_run from deletion_context)),1,'pending jobs preserved');
insert into deletion_tap select is((select count(*)::integer from jsonb_array_elements(public.get_line_notification_management((select shop from deletion_context))->'runs') r where r->>'id'=(select run_id::text from deletion_context)),0,'deleted notification absent from management view');
insert into deletion_tap select is(app_private.enqueue_line_report((select shop from deletion_context),'CLOSING',(select session from deletion_context),now(),now(),'closing:'||(select session::text from deletion_context)),(select run_id from deletion_context),'duplicate report reuses the receipt instead of re-sending');
insert into deletion_tap select is((select count(*)::integer from public.notification_jobs where report_run_id=(select run_id from deletion_context)),0,'retry does not recreate delivery jobs');
insert into deletion_tap select * from finish();
select result from deletion_tap;
rollback;
