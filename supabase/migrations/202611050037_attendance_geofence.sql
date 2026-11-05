begin;

-- The old overload becomes an internal command. Authenticated clients must
-- supply a recent position to the checked overload below.
revoke execute on function public.clock_in_staff(uuid) from public,anon,authenticated;
create function public.clock_in_staff(
  target_shop_id uuid,staff_latitude double precision,staff_longitude double precision,
  staff_accuracy_m double precision,location_captured_at timestamptz
)
returns void language plpgsql security definer set search_path='' as $$
declare location public.shop_locations; distance double precision;
begin
  if not app_private.is_active_shop_member(target_shop_id) then
    raise exception using errcode='42501',message='Active shop membership is required.';
  end if;
  if staff_latitude is null or staff_longitude is null
    or not(staff_latitude between -90 and 90) or not(staff_longitude between -180 and 180) then
    raise exception using errcode='22023',message='Location coordinates are missing or invalid.';
  end if;
  if staff_accuracy_m is null or not(staff_accuracy_m between 0 and 100) then
    raise exception using errcode='22023',message='Location accuracy must be within 100 meters.';
  end if;
  if location_captured_at is null or location_captured_at<now()-interval '60 seconds'
    or location_captured_at>now()+interval '10 seconds' then
    raise exception using errcode='22023',message='Location reading is stale or invalid.';
  end if;
  perform 1 from public.shops where id=target_shop_id and deleted_at is null for share;
  if not found then raise exception using errcode='P0001',message='Shop is unavailable.'; end if;
  select * into location from public.shop_locations where shop_id=target_shop_id for share;
  if location.id is null then
    raise exception using errcode='P0001',message='Shop location is not configured.';
  end if;
  distance:=app_private.distance_meters(staff_latitude,staff_longitude,location.latitude::double precision,location.longitude::double precision);
  if distance>location.geofence_radius_m then
    raise exception using errcode='42501',message='Staff is outside the clock-in area.';
  end if;
  perform public.clock_in_staff(target_shop_id);
end;
$$;
revoke execute on function public.clock_in_staff(uuid,double precision,double precision,double precision,timestamptz) from public,anon;
grant execute on function public.clock_in_staff(uuid,double precision,double precision,double precision,timestamptz) to authenticated;
commit;
