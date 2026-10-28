begin;

alter table public.user_profiles enable row level security;
alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.shop_locations enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table public.user_profiles from anon, authenticated;
revoke all on table public.shops from anon, authenticated;
revoke all on table public.shop_members from anon, authenticated;
revoke all on table public.shop_locations from anon, authenticated;
revoke all on table public.audit_logs from anon, authenticated;
revoke all on sequence public.audit_logs_id_seq from anon, authenticated;

grant select on table public.user_profiles to authenticated;
grant update (display_name, avatar_url) on table public.user_profiles to authenticated;
grant select on table public.shops to authenticated;
grant select on table public.shop_members to authenticated;
grant select, insert, update, delete on table public.shop_locations to authenticated;
grant select on table public.audit_logs to authenticated;

grant usage on schema app_private to authenticated;
revoke execute on all functions in schema app_private from public, anon, authenticated;
grant execute on function app_private.is_active_shop_member(uuid, public.shop_role[]) to authenticated;
grant execute on function app_private.can_view_profile(uuid) to authenticated;

revoke execute on function public.grant_shop_member(uuid, uuid, public.shop_role) from public, anon;
revoke execute on function public.revoke_shop_member(uuid, uuid) from public, anon;
grant execute on function public.grant_shop_member(uuid, uuid, public.shop_role) to authenticated;
grant execute on function public.revoke_shop_member(uuid, uuid) to authenticated;

revoke execute on function app_private.provision_first_owner(uuid, text, text, text)
  from public, anon, authenticated;

create policy user_profiles_select_authorized
on public.user_profiles
for select
to authenticated
using ((select app_private.can_view_profile(id)));

create policy user_profiles_update_self
on public.user_profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy shops_select_active_member
on public.shops
for select
to authenticated
using ((select app_private.is_active_shop_member(id)));

create policy shop_members_select_self_or_owner
on public.shop_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select app_private.is_active_shop_member(shop_id, array['OWNER']::public.shop_role[]))
);

create policy shop_locations_select_owner
on public.shop_locations
for select
to authenticated
using ((select app_private.is_active_shop_member(shop_id, array['OWNER']::public.shop_role[])));

create policy shop_locations_insert_owner
on public.shop_locations
for insert
to authenticated
with check ((select app_private.is_active_shop_member(shop_id, array['OWNER']::public.shop_role[])));

create policy shop_locations_update_owner
on public.shop_locations
for update
to authenticated
using ((select app_private.is_active_shop_member(shop_id, array['OWNER']::public.shop_role[])))
with check ((select app_private.is_active_shop_member(shop_id, array['OWNER']::public.shop_role[])));

create policy shop_locations_delete_owner
on public.shop_locations
for delete
to authenticated
using ((select app_private.is_active_shop_member(shop_id, array['OWNER']::public.shop_role[])));

create policy audit_logs_select_owner
on public.audit_logs
for select
to authenticated
using ((select app_private.is_active_shop_member(shop_id, array['OWNER']::public.shop_role[])));

commit;


