begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
create temporary table service_context(actor uuid, shop uuid, table_id uuid, qr uuid);
do $$
declare a uuid; s uuid:=gen_random_uuid(); t uuid;
begin
 select user_id into strict a from public.shop_members where role='OWNER' and status='ACTIVE' limit 1;
 insert into public.shops(id,name,created_by) values(s,'Service QA',a);
 insert into public.shop_members(shop_id,user_id,role,granted_by) values(s,a,'OWNER',a);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 t:=public.save_dining_table(s,'โต๊ะ QA');
 perform public.open_store_session(s);
 insert into service_context select a,s,t,qr_token from public.dining_tables where id=t;
end $$;
select lives_ok($$select public.request_table_service(qr,'BILL') from service_context$$,'customer requests bill');
select lives_ok($$select public.request_table_service(qr,'BILL') from service_context$$,'duplicate request is safe');
select is((select count(*)::integer from public.table_service_requests where shop_id=(select shop from service_context)),1,'duplicate pending request is deduplicated');
select is(jsonb_array_length(public.list_table_service_requests((select shop from service_context))),1,'staff sees request');
select is(public.list_table_service_requests((select shop from service_context))->0->>'type','BILL','staff sees request type');
select lives_ok($$select public.acknowledge_table_service_request(id) from public.table_service_requests where shop_id=(select shop from service_context)$$,'staff acknowledges request');
select is(jsonb_array_length(public.list_table_service_requests((select shop from service_context))),0,'acknowledged request leaves pending list');
select throws_ok($$select public.request_table_service(qr,'OTHER') from service_context$$,'P0001','Invalid request type.','invalid request rejected');
select ok(not has_table_privilege('anon','public.table_service_requests','SELECT'),'anonymous cannot read requests');
select ok(not has_function_privilege('anon','public.list_table_service_requests(uuid)','EXECUTE'),'anonymous cannot list requests');
select * from finish();
rollback;
