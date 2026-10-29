begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

select has_type('public', 'store_event_type', 'store event enum exists');
select has_table('public', 'store_events', 'store events table exists');
select col_is_fk('public', 'store_events', 'store_session_id', 'store event references session');
select has_function('public', 'get_store_management', array['uuid']);
select has_function('public', 'open_store_session', array['uuid']);
select has_function('public', 'close_store_session', array['uuid', 'uuid']);
select ok(has_function_privilege('authenticated', 'public.open_store_session(uuid)', 'EXECUTE'), 'authenticated can call owner-checked open RPC');
select ok(not has_function_privilege('anon', 'public.open_store_session(uuid)', 'EXECUTE'), 'anonymous cannot open store');
select ok(not has_table_privilege('authenticated', 'public.store_sessions', 'INSERT'), 'members cannot insert sessions directly');
select ok(not has_table_privilege('authenticated', 'public.store_sessions', 'UPDATE'), 'members cannot update sessions directly');
select policies_are('public', 'store_events', array['store_events_select_member'], 'store events use member-only RLS');
select ok(
  exists (select 1 from pg_catalog.pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'store_sessions'),
  'store sessions are published to realtime'
);

select * from finish();
rollback;

