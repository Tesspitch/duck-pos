begin;

create or replace function app_private.distance_meters(
  latitude_a double precision,
  longitude_a double precision,
  latitude_b double precision,
  longitude_b double precision
)
returns double precision
language plpgsql
immutable
set search_path = ''
as $$
begin
  if latitude_a is null or longitude_a is null or latitude_b is null or longitude_b is null
    or not (latitude_a between -90 and 90) or not (latitude_b between -90 and 90)
    or not (longitude_a between -180 and 180) or not (longitude_b between -180 and 180) then
    raise exception using errcode = '22023', message = 'Location coordinates are missing or invalid.';
  end if;
  return 6371000 * 2 * asin(sqrt(least(1::double precision, greatest(0::double precision,
    power(sin(radians(latitude_b - latitude_a) / 2), 2)
    + cos(radians(latitude_a)) * cos(radians(latitude_b))
    * power(sin(radians(longitude_b - longitude_a) / 2), 2)
  ))));
end;
$$;

-- CREATE OR REPLACE preserves the existing private function's grants.
commit;
