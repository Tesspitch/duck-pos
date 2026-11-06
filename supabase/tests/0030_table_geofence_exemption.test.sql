begin;
create extension if not exists pgtap with schema extensions;
create temporary table auto_tap(result text) on commit drop;
insert into auto_tap select no_plan();
create temporary table auto_context(actor uuid,shop uuid,store_id uuid,tid uuid,qr uuid,epoch uuid,product uuid,guest uuid,key uuid,token uuid,bill uuid,order_id uuid,fp text) on commit drop;
do $$
declare a uuid; s uuid:=gen_random_uuid(); cat uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); t uuid; ss uuid;
begin
 select user_id into strict a from public.shop_members where role='OWNER' and status='ACTIVE' limit 1;
 insert into public.shops(id,name,created_by) values(s,'Auto table QA',a);
 insert into public.shop_members(shop_id,user_id,role,granted_by) values(s,a,'OWNER',a);
 insert into public.shop_locations(shop_id,latitude,longitude) values(s,16,103);
 insert into public.categories(id,shop_id,name) values(cat,s,'QA');
 insert into public.products(id,shop_id,category_id,name,base_price_satang) values(p,s,cat,'Kebab',3900);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 t:=public.save_dining_table(s,'Auto table'); ss:=(public.open_store_session(s)->>'id')::uuid;
 insert into auto_context select a,s,ss,t,qr_token,ordering_epoch,p,gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null,null,null from public.dining_tables where id=t;
end $$;

create function pg_temp.table_request(lat double precision default null) returns jsonb language sql as $$
 select public.create_auto_table_qr_order(shop,qr,epoch,guest,gen_random_uuid(),gen_random_uuid(),lat,null,null,null,jsonb_build_array(jsonb_build_object('productId',product,'quantity',1))) from auto_context;
$$;
insert into auto_tap select ok(not has_function_privilege('authenticated','app_private.create_customer_order(uuid,uuid,uuid,double precision,double precision,double precision,timestamptz,jsonb,text,boolean)','EXECUTE'),'client cannot call shared core with geofence disabled');
insert into auto_tap select ok(not has_function_privilege('service_role','app_private.create_customer_order(uuid,uuid,uuid,double precision,double precision,double precision,timestamptz,jsonb,text,boolean)','EXECUTE'),'service client also uses validated public entry points');
insert into auto_tap select throws_ok($$select public.create_qr_order(shop,gen_random_uuid(),gen_random_uuid(),17,103,10,now(),jsonb_build_array(jsonb_build_object('productId',product,'quantity',1))) from auto_context$$,'42501','Customer is outside the ordering area.','takeaway retains 100m geofence');
insert into auto_tap select throws_ok($$select public.create_qr_order(shop,gen_random_uuid(),gen_random_uuid(),null,null,null,null,jsonb_build_array(jsonb_build_object('productId',product,'quantity',1))) from auto_context$$,'22023','Location accuracy must be within 100 meters.','takeaway still requires location');
insert into auto_tap select lives_ok($$select pg_temp.table_request()$$,'table first order accepts no GPS at all');
insert into auto_tap select lives_ok($$select pg_temp.table_request(17)$$,'table order ignores distance from cashier');
insert into auto_tap select is((select count(*)::integer from public.orders where shop_id=(select shop from auto_context) and location_accuracy_m is null and location_distance_m is null),2,'table does not store fabricated GPS measurements');
insert into auto_tap select is(jsonb_array_length(public.list_active_staff_orders((select shop from auto_context))->'orders'),2,'location-free table orders reach staff queue');
update auto_context set bill=(public.get_dining_table_context(qr)->>'billId')::uuid;
insert into auto_tap select is(public.get_table_bill((select bill from auto_context))->>'totalSatang','7800','server pricing still authoritative without GPS');
delete from public.shop_locations where shop_id=(select shop from auto_context);
insert into auto_tap select lives_ok($$select pg_temp.table_request()$$,'table orders work even without cashier coordinates configured');
insert into auto_tap select lives_ok($$select public.create_table_qr_order(shop,qr,bill,guest,gen_random_uuid(),gen_random_uuid(),null,null,null,null,jsonb_build_array(jsonb_build_object('productId',product,'quantity',1))) from auto_context$$,'existing manual table rounds also accept no location');
insert into auto_tap select throws_ok($$select public.create_qr_order(shop,gen_random_uuid(),gen_random_uuid(),16,103,10,now(),jsonb_build_array(jsonb_build_object('productId',product,'quantity',1))) from auto_context$$,'P0001','Shop location is not configured.','takeaway requires configured shop coordinates');
insert into auto_tap select throws_ok($$select public.create_auto_table_qr_order(shop,gen_random_uuid(),epoch,guest,gen_random_uuid(),gen_random_uuid(),null,null,null,null,jsonb_build_array(jsonb_build_object('productId',product,'quantity',1))) from auto_context$$,'P0001','Table not found.','no geofence exemption without valid table QR');
select public.set_table_bill_checkout(bill,true) from auto_context;
insert into auto_tap select throws_ok($$select pg_temp.table_request()$$,'P0001','Table is not accepting orders.','bill freeze still blocks orders without location');
insert into auto_tap select is((select count(*)::integer from public.orders where shop_id=(select shop from auto_context)),4,'invalid table and frozen checkout do not add orders');
insert into auto_tap select * from finish();
select result from auto_tap;
rollback;

