begin;
create extension if not exists pgtap with schema extensions;
create temporary table completion_tap(result text) on commit drop;
insert into completion_tap select plan(14);
create temporary table completion_context(actor uuid, shop uuid, session uuid, queued uuid, preparing uuid, ready uuid, cancelled uuid, other_order uuid) on commit drop;
do $$
declare
  actor_id uuid;
  shop_id uuid := gen_random_uuid();
  other_shop uuid := gen_random_uuid();
  session_id uuid := gen_random_uuid();
  other_session uuid := gen_random_uuid();
  order_id uuid;
  state public.order_status;
  queued_id uuid; preparing_id uuid; ready_id uuid; cancelled_id uuid; other_id uuid := gen_random_uuid();
  queue_value integer := 0;
begin
  select user_id into strict actor_id from public.shop_members where role='OWNER' and status='ACTIVE' limit 1;
  insert into public.shops(id,name,timezone,created_by) values (shop_id,'Completion QA','Asia/Bangkok',actor_id),(other_shop,'Other completion QA','Asia/Bangkok',actor_id);
  insert into public.shop_members(shop_id,user_id,role,status,granted_by) values (shop_id,actor_id,'STAFF','ACTIVE',actor_id);
  insert into public.store_sessions(id,shop_id,business_date,opened_by) values (session_id,shop_id,current_date,actor_id),(other_session,other_shop,current_date,actor_id);
  foreach state in array array['QUEUED','PREPARING','READY','CANCELLED']::public.order_status[] loop
    order_id := gen_random_uuid(); queue_value := queue_value + 1;
    insert into public.orders(id,shop_id,store_session_id,business_date,queue_number,order_reference,source,status,payment_status,subtotal_satang,total_satang,idempotency_key,tracking_token_hash)
      values(order_id,shop_id,session_id,current_date,queue_value,'QA-COMPLETE-'||queue_value,case when state='QUEUED' then 'QR'::public.order_source else 'POS'::public.order_source end,state,'UNPAID',3900,3900,gen_random_uuid(),encode(extensions.digest(order_id::text,'sha256'),'hex'));
    case state when 'QUEUED' then queued_id:=order_id; when 'PREPARING' then preparing_id:=order_id; when 'READY' then ready_id:=order_id; else cancelled_id:=order_id; end case;
  end loop;
  insert into public.orders(id,shop_id,store_session_id,business_date,queue_number,order_reference,source,status,payment_status,subtotal_satang,total_satang,idempotency_key,tracking_token_hash)
    values(other_id,other_shop,other_session,current_date,1,'QA-OTHER','POS','QUEUED','UNPAID',3900,3900,gen_random_uuid(),encode(extensions.digest(other_id::text,'sha256'),'hex'));
  insert into completion_context values(actor_id,shop_id,session_id,queued_id,preparing_id,ready_id,cancelled_id,other_id);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor_id,'role','authenticated')::text,true);
end $$;

insert into completion_tap select throws_ok($$select public.update_order_status((select queued from completion_context),'QUEUED','COMPLETED')$$,'P0001','Payment is required before completing an order.','unpaid order cannot be completed');
insert into completion_tap select lives_ok($$select public.record_order_payment((select queued from completion_context),'BANK_TRANSFER',3900)$$,'staff records transfer');
insert into completion_tap select lives_ok($$select public.update_order_status((select queued from completion_context),'QUEUED','COMPLETED')$$,'staff completes queued QR order in one step');
insert into completion_tap select is(public.track_order((select queued from completion_context))->>'status','COMPLETED','customer tracking immediately reads completed');
insert into completion_tap select is((select count(*)::integer from jsonb_array_elements(public.list_active_staff_orders((select shop from completion_context))->'orders') o where o->>'id'=(select queued::text from completion_context)),0,'completed order disappears from active queue');
insert into completion_tap select is((select count(*)::integer from public.order_events where order_id=(select queued from completion_context)),1,'one click produces one status event');
insert into completion_tap select throws_ok($$select public.update_order_status((select queued from completion_context),'QUEUED','COMPLETED')$$,'40001','Order status changed on another device.','stale duplicate completion is rejected');
insert into completion_tap select throws_ok($$select public.update_order_status((select cancelled from completion_context),'CANCELLED','COMPLETED')$$,'22023','Invalid order status transition.','cancelled order cannot complete');
insert into completion_tap select lives_ok($$select public.record_order_payment((select preparing from completion_context),'BANK_TRANSFER',3900)$$,'staff records transfer on legacy preparing order');
insert into completion_tap select lives_ok($$select public.update_order_status((select preparing from completion_context),'PREPARING','COMPLETED')$$,'legacy preparing POS order completes directly');
insert into completion_tap select lives_ok($$select public.record_order_payment((select ready from completion_context),'CASH',5000)$$,'cash remains supported');
insert into completion_tap select lives_ok($$select public.update_order_status((select ready from completion_context),'READY','COMPLETED')$$,'legacy ready POS order completes');
insert into completion_tap select throws_ok($$select public.update_order_status((select other_order from completion_context),'QUEUED','COMPLETED')$$,'42501','Active shop membership is required.','staff cannot complete another shop order');
insert into completion_tap select ok(not exists(select 1 from public.order_events where shop_id=(select shop from completion_context) and actor_user_id<>(select actor from completion_context)),'status events retain acting staff identity');
insert into completion_tap select * from finish();
select result from completion_tap;
rollback;
