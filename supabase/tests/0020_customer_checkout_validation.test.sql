begin;
create extension if not exists pgtap with schema extensions;
create temporary table checkout_tap(result text) on commit drop;
insert into checkout_tap select plan(15);

do $$
declare
  actor uuid;
begin
  select user_id into strict actor from public.shop_members where role='OWNER' and status='ACTIVE' limit 1;
  insert into public.shops(id,name,timezone,created_by)
    values ('fafafafa-0000-0000-0000-000000000001','Checkout QA','Asia/Bangkok',actor);
  insert into public.categories(id,shop_id,name)
    values ('fafafafa-0000-0000-0000-000000000002','fafafafa-0000-0000-0000-000000000001','QA');
  insert into public.products(id,shop_id,category_id,name,base_price_satang)
    values ('fafafafa-0000-0000-0000-000000000003','fafafafa-0000-0000-0000-000000000001','fafafafa-0000-0000-0000-000000000002','QA Kebab',3900);
  insert into public.shop_locations(shop_id,latitude,longitude)
    values ('fafafafa-0000-0000-0000-000000000001',13.7563,100.5018);
  insert into public.store_sessions(shop_id,business_date,opened_by)
    values ('fafafafa-0000-0000-0000-000000000001',current_date-1,actor);
end $$;

-- Only a temporary helper; it is removed with the transaction.
create function pg_temp.checkout_at(lat double precision, lon double precision, accuracy double precision default 5,
  captured timestamptz default now(), request_key uuid default gen_random_uuid(),
  token uuid default 'fafafafa-0000-0000-0000-000000000005') returns jsonb
language sql as $$
  select public.create_qr_order('fafafafa-0000-0000-0000-000000000001',request_key,token,lat,lon,accuracy,captured,
    '[{"productId":"fafafafa-0000-0000-0000-000000000003","quantity":1,"optionIds":[],"price":1}]'::jsonb,'');
$$;

insert into checkout_tap select throws_ok($$select pg_temp.checkout_at(null,100.5018)$$,'22023','Location coordinates are missing or invalid.','missing latitude is rejected');
insert into checkout_tap select throws_ok($$select pg_temp.checkout_at(13.7563,null)$$,'22023','Location coordinates are missing or invalid.','missing longitude is rejected');
insert into checkout_tap select throws_ok($$select pg_temp.checkout_at(91,100.5018)$$,'22023','Location coordinates are missing or invalid.','latitude outside valid range is rejected');
insert into checkout_tap select throws_ok($$select pg_temp.checkout_at(13.7563,181)$$,'22023','Location coordinates are missing or invalid.','longitude outside valid range is rejected');
insert into checkout_tap select throws_ok($$select pg_temp.checkout_at('NaN',100.5018)$$,'22023','Location coordinates are missing or invalid.','NaN is rejected');
insert into checkout_tap select throws_ok($$select pg_temp.checkout_at(13.7563,100.5018,101)$$,'22023','Location accuracy must be within 100 meters.','inaccurate position is rejected');
insert into checkout_tap select throws_ok($$select pg_temp.checkout_at(13.7563,100.5018,5,now()-interval '2 minutes')$$,'22023','Location reading is stale or invalid.','stale position is rejected');
insert into checkout_tap select throws_ok($$select pg_temp.checkout_at(13.7583,100.5018)$$,'42501','Customer is outside the ordering area.','outside geofence is rejected');
insert into checkout_tap select is((select count(*)::integer from public.orders where shop_id='fafafafa-0000-0000-0000-000000000001'),0,'rejected checkout leaves no order');
insert into checkout_tap select lives_ok($$select pg_temp.checkout_at(13.7563,100.5018,5,now(),'fafafafa-0000-0000-0000-000000000004')$$,'valid checkout succeeds');
insert into checkout_tap select lives_ok($$select pg_temp.checkout_at(13.7563,100.5018,5,now(),'fafafafa-0000-0000-0000-000000000004')$$,'same checkout identity safely retries');
insert into checkout_tap select is((select total_satang from public.orders where shop_id='fafafafa-0000-0000-0000-000000000001'),3900,'client price is ignored and exactly one order exists');
insert into checkout_tap select is((public.track_order('fafafafa-0000-0000-0000-000000000005')->>'status'),'QUEUED','correct token tracks queued order');
insert into checkout_tap select ok(public.track_order('fafafafa-0000-0000-0000-000000000006') is null,'wrong token reveals no order');
insert into checkout_tap select is(public.track_order('fafafafa-0000-0000-0000-000000000005')->>'shopId','fafafafa-0000-0000-0000-000000000001','tracking returns the correct shop for menu navigation');
insert into checkout_tap select * from finish();
select result from checkout_tap;
rollback;
