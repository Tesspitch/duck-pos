begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

create temporary table phase5_context on commit drop as
select user_id
from public.shop_members
where status = 'ACTIVE' and role = 'OWNER'
order by created_at
limit 1;

insert into public.shops (id, name, timezone, created_by)
select 'bbbbbbbb-0000-0000-0000-000000000001', 'Phase 5 Test Shop', 'Asia/Bangkok', user_id
from phase5_context;
insert into public.shop_members (shop_id, user_id, role, status, granted_by)
select 'bbbbbbbb-0000-0000-0000-000000000001', user_id, 'OWNER', 'ACTIVE', user_id
from phase5_context;
select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', (select user_id from phase5_context), 'role', 'authenticated')::text,
  true
);

select lives_ok(
  $$select public.open_store_session('bbbbbbbb-0000-0000-0000-000000000001')$$,
  'owner opens store'
);
select is(
  (select count(*)::integer from public.store_sessions where shop_id = 'bbbbbbbb-0000-0000-0000-000000000001' and status = 'OPEN'),
  1,
  'one session is open'
);
select is(
  (select business_date from public.store_sessions where shop_id = 'bbbbbbbb-0000-0000-0000-000000000001' and status = 'OPEN'),
  timezone('Asia/Bangkok', now())::date,
  'business date uses shop timezone'
);
select throws_ok(
  $$select public.open_store_session('bbbbbbbb-0000-0000-0000-000000000001')$$,
  '23505',
  'The store already has an open session.',
  'duplicate open is blocked'
);
select is(
  (public.get_store_management('bbbbbbbb-0000-0000-0000-000000000001') ->> 'isOpen')::boolean,
  true,
  'management API reports open'
);
select lives_ok(
  $$select public.close_store_session(
    'bbbbbbbb-0000-0000-0000-000000000001',
    (select id from public.store_sessions where shop_id = 'bbbbbbbb-0000-0000-0000-000000000001' and status = 'OPEN')
  )$$,
  'owner closes empty session'
);
select is(
  (select status::text from public.store_sessions where shop_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'CLOSED',
  'session is closed'
);
select is(
  (select count(*)::integer from public.store_events where shop_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  2,
  'open and close events are recorded'
);

select * from finish();
rollback;

