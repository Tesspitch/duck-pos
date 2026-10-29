begin;

create or replace function public.save_shop_location(
  target_shop_id uuid,
  target_latitude numeric,
  target_longitude numeric
)
returns public.shop_locations
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_location public.shop_locations;
begin
  if not app_private.is_active_shop_member(target_shop_id, array['OWNER']::public.shop_role[]) then
    raise exception using errcode = '42501', message = 'Only an active shop owner can update shop location.';
  end if;

  insert into public.shop_locations (shop_id, latitude, longitude, geofence_radius_m)
  values (target_shop_id, target_latitude, target_longitude, 100)
  on conflict (shop_id) do update
  set latitude = excluded.latitude,
      longitude = excluded.longitude,
      geofence_radius_m = 100,
      updated_at = now()
  returning * into saved_location;

  insert into public.audit_logs (shop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    target_shop_id,
    (select auth.uid()),
    'SHOP_LOCATION_UPDATED',
    'shop_location',
    saved_location.id,
    jsonb_build_object('latitude', saved_location.latitude, 'longitude', saved_location.longitude)
  );

  return saved_location;
end;
$$;

revoke insert, update, delete on table public.shop_locations from authenticated;
revoke execute on function public.save_shop_location(uuid, numeric, numeric) from public, anon;
grant execute on function public.save_shop_location(uuid, numeric, numeric) to authenticated;

commit;
