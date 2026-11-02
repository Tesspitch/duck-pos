begin;
create extension if not exists pgtap with schema extensions;
create temporary table feature_tap(result text) on commit drop;
insert into feature_tap select no_plan();
create temporary table feature_context(actor uuid,shop uuid,session uuid,queued uuid,preparing uuid,paid uuid,pos uuid,completed uuid,ready uuid) on commit drop;
do $$
declare a uuid; s uuid:=gen_random_uuid(); ss uuid:=gen_random_uuid(); q uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); paid uuid:=gen_random_uuid(); pos uuid:=gen_random_uuid(); done uuid:=gen_random_uuid(); ready uuid:=gen_random_uuid();
begin
  select user_id into strict a from public.shop_members where role='OWNER' and status='ACTIVE' limit 1;
  insert into public.shops(id,name,created_by) values(s,'Archive QA',a);
  insert into public.shop_members(shop_id,user_id,role,status,granted_by) values(s,a,'OWNER','ACTIVE',a);
  insert into public.store_sessions(id,shop_id,business_date,opened_by) values(ss,s,current_date,a);
  insert into public.orders(id,shop_id,store_session_id,business_date,queue_number,order_reference,source,status,payment_status,subtotal_satang,total_satang,idempotency_key,tracking_token_hash)
  select id,s,ss,current_date,n,'QA-ARCHIVE-'||n,source::public.order_source,status::public.order_status,payment::public.payment_status,3900,3900,gen_random_uuid(),encode(extensions.digest(id::text,'sha256'),'hex')
  from (values(q,1,'QR','QUEUED','UNPAID'),(p,2,'QR','QUEUED','UNPAID'),(paid,3,'QR','QUEUED','PAID'),(pos,4,'POS','QUEUED','UNPAID'),(done,5,'QR','COMPLETED','UNPAID'),(ready,6,'QR','READY','UNPAID')) v(id,n,source,status,payment);
  insert into feature_context values(a,s,ss,q,p,paid,pos,done,ready);
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
end $$;

-- Execute through the real anonymous role, including the function ACL.
grant select on feature_context to anon,authenticated;
grant insert,select on feature_tap to anon,authenticated;
set local role anon;
insert into feature_tap select lives_ok($$select public.cancel_customer_order((select queued from feature_context))$$,'anonymous customer cancels using the matching secret token');
insert into feature_tap select is(public.track_order((select queued from feature_context))->>'status','CANCELLED','tracking reflects cancellation');
insert into feature_tap select lives_ok($$select public.cancel_customer_order((select queued from feature_context))$$,'retry is idempotent');
insert into feature_tap select throws_ok($$select public.cancel_customer_order(gen_random_uuid())$$,'P0002','Order not found.','random token cannot cancel an order');
insert into feature_tap select throws_ok($$select public.cancel_customer_order((select pos from feature_context))$$,'P0002','Order not found.','POS orders are not cancellable with the customer API');
insert into feature_tap select throws_ok($$select public.cancel_customer_order((select paid from feature_context))$$,'P0001','Please contact the shop to cancel a paid order.','paid orders retain the existing refund safeguard');
insert into feature_tap select throws_ok($$select public.cancel_customer_order((select completed from feature_context))$$,'P0001','Preparation has started. Please contact the shop.','completed order cannot cancel');
insert into feature_tap select throws_ok($$select public.cancel_customer_order((select ready from feature_context))$$,'P0001','Preparation has started. Please contact the shop.','ready order cannot cancel');
reset role;
insert into feature_tap select is((select count(*)::integer from public.order_events where order_id=(select queued from feature_context)),1,'retry writes only one cancellation event');
insert into feature_tap select is((select count(*)::integer from public.audit_logs where entity_id=(select queued from feature_context) and action='CUSTOMER_ORDER_CANCELLED'),1,'customer cancellation is audited without a fake staff identity');
select set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true) from feature_context;
insert into feature_tap select throws_ok($$select public.update_order_status((select queued from feature_context),'QUEUED','PREPARING')$$,'40001','Order status changed on another device.','customer cancellation wins: stale staff start cannot revive the order');
insert into feature_tap select lives_ok($$select public.update_order_status((select preparing from feature_context),'QUEUED','PREPARING')$$,'staff starts cooking');
insert into feature_tap select is(public.track_order((select preparing from feature_context))->>'status','PREPARING','customer sees preparing');
insert into feature_tap select throws_ok($$select public.cancel_customer_order((select preparing from feature_context))$$,'P0001','Preparation has started. Please contact the shop.','staff start wins: customer cancellation is rejected');
insert into feature_tap select is(public.track_order((select preparing from feature_context))->>'paymentStatus','UNPAID','tracking exposes payment status without privileged data');
insert into feature_tap select is((select count(*)::integer from jsonb_array_elements(public.list_active_staff_orders((select shop from feature_context))->'orders') o where o->>'id'=(select queued::text from feature_context)),0,'cancelled order disappears from staff queue');

-- A fresh JWT subject has no platform-admin membership.
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
insert into feature_tap select throws_ok($$select public.list_platform_shops()$$,'42501','Platform administrator access required.','shop owner cannot list platform shops');
insert into feature_tap select throws_ok($$select public.delete_platform_shop((select shop from feature_context),'Archive QA')$$,'42501','Platform administrator access required.','shop owner cannot delete a shop');
insert into public.platform_admins(user_id) select actor from feature_context on conflict do nothing;
select set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true) from feature_context;
insert into feature_tap select is((public.list_platform_shops('Archive QA')->'shops'->0->>'id'),(select shop::text from feature_context),'platform admin can search the shop');
insert into feature_tap select throws_ok($$select public.delete_platform_shop((select shop from feature_context),'Wrong name')$$,'22023','Shop name confirmation does not match.','server requires matching name confirmation');
insert into feature_tap select throws_ok($$select public.delete_platform_shop((select shop from feature_context),'Archive QA')$$,'P0001','Close the store session before deleting this shop.','cannot archive an open session');
update public.store_sessions set status='CLOSED',closed_at=now(),closed_by=(select actor from feature_context) where id=(select session from feature_context);
insert into feature_tap select throws_ok($$select public.delete_platform_shop((select shop from feature_context),'Archive QA')$$,'P0001','Resolve pending orders and payments before deleting this shop.','cannot archive pending work or collection');
-- Settle synthetic fixtures directly; do not send LINE notifications or touch real orders.
update public.orders set status='COMPLETED' where shop_id=(select shop from feature_context) and status<>'CANCELLED';
insert into feature_tap select throws_ok($$select public.delete_platform_shop((select shop from feature_context),'Archive QA')$$,'P0001','Resolve pending orders and payments before deleting this shop.','completed unpaid orders alone still prevent archival');
update public.orders set status='COMPLETED',payment_status='PAID' where shop_id=(select shop from feature_context) and status<>'CANCELLED';
insert into feature_tap select lives_ok($$select public.delete_platform_shop((select shop from feature_context),'Archive QA')$$,'admin archives the settled shop');
insert into feature_tap select ok((select deleted_at is not null and deleted_by=(select actor from feature_context) from public.shops where id=(select shop from feature_context)),'archive records time and administrator');
insert into feature_tap select is((select count(*)::integer from public.orders where shop_id=(select shop from feature_context)),6,'historical orders are preserved');
insert into feature_tap select ok(not app_private.is_active_shop_member((select shop from feature_context)),'archived membership loses server authorization');
insert into feature_tap select is(public.get_public_menu((select shop from feature_context)),null::jsonb,'archived shop has no public menu');
insert into feature_tap select is(jsonb_array_length(public.list_platform_shops('Archive QA')->'shops'),0,'archived shop disappears from admin active list');
insert into feature_tap select is(public.track_order((select queued from feature_context))->>'status','CANCELLED','existing customer tracking remains accessible');
insert into feature_tap select lives_ok($$select public.delete_platform_shop((select shop from feature_context),'Archive QA')$$,'duplicate archive is idempotent');
insert into feature_tap select is((select count(*)::integer from public.audit_logs where shop_id=(select shop from feature_context) and action='SHOP_DELETED'),1,'shop deletion is audited once');
insert into feature_tap select throws_ok($$select public.open_store_session((select shop from feature_context))$$,'42501','Active owner or staff membership is required to open the store.','archived shop cannot reopen');
insert into feature_tap select throws_ok($$insert into public.store_sessions(shop_id,business_date,opened_by) select shop,current_date,actor from feature_context$$,'P0001','Shop is unavailable.','direct inserts cannot bypass shop archival');
set local role authenticated;
insert into feature_tap select is((select count(*)::integer from public.shops where id=(select shop from feature_context)),0,'RLS hides the archived shop from its owner');
insert into feature_tap select is((select count(*)::integer from public.shop_members m join public.shops s on s.id=m.shop_id where m.shop_id=(select shop from feature_context)),0,'membership join no longer exposes the archived shop in branch selector');
reset role;
insert into feature_tap select * from finish();
select result from feature_tap;
rollback;
