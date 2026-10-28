begin;

alter table public.shops
add column logo_path text check (
  logo_path is null
  or (
    char_length(logo_path) between 1 and 500
    and logo_path !~ '(^|/)\.\.(/|$)'
  )
);

create or replace function public.update_my_profile(profile_display_name text)
returns public.user_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  saved_profile public.user_profiles;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  if profile_display_name is null
    or char_length(btrim(profile_display_name)) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Display name must contain 1 to 100 characters.';
  end if;

  update public.user_profiles
  set display_name = btrim(profile_display_name)
  where id = actor_id
  returning * into saved_profile;

  if saved_profile.id is null then
    raise exception using errcode = 'P0002', message = 'Profile not found.';
  end if;

  return saved_profile;
end;
$$;

create or replace function public.update_shop_branding(
  target_shop_id uuid,
  shop_name text,
  shop_logo_path text
)
returns public.shops
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_shop public.shops;
begin
  if not app_private.is_active_shop_member(
    target_shop_id,
    array['OWNER']::public.shop_role[]
  ) then
    raise exception using errcode = '42501', message = 'Only an active shop owner can update shop branding.';
  end if;

  update public.shops
  set name = btrim(shop_name),
      logo_path = nullif(btrim(shop_logo_path), '')
  where id = target_shop_id
  returning * into saved_shop;

  if saved_shop.id is null then
    raise exception using errcode = 'P0002', message = 'Shop not found.';
  end if;

  insert into public.audit_logs (
    shop_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    target_shop_id,
    (select auth.uid()),
    'SHOP_BRANDING_UPDATED',
    'shop',
    target_shop_id,
    jsonb_build_object(
      'name', saved_shop.name,
      'has_logo', saved_shop.logo_path is not null
    )
  );

  return saved_shop;
end;
$$;

revoke execute on function public.update_my_profile(text) from public, anon;
revoke execute on function public.update_shop_branding(uuid, text, text) from public, anon;
revoke update (display_name, avatar_url) on table public.user_profiles from authenticated;
grant execute on function public.update_my_profile(text) to authenticated;
grant execute on function public.update_shop_branding(uuid, text, text) to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'shop-assets',
  'shop-assets',
  true,
  2097152,
  array['image/webp', 'image/jpeg', 'image/png', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy shop_assets_insert_owner
on storage.objects for insert to authenticated
with check (
  bucket_id = 'shop-assets'
  and (select app_private.is_active_shop_member(
    app_private.storage_object_shop_id(name),
    array['OWNER']::public.shop_role[]
  ))
);

create policy shop_assets_update_owner
on storage.objects for update to authenticated
using (
  bucket_id = 'shop-assets'
  and (select app_private.is_active_shop_member(
    app_private.storage_object_shop_id(name),
    array['OWNER']::public.shop_role[]
  ))
)
with check (
  bucket_id = 'shop-assets'
  and (select app_private.is_active_shop_member(
    app_private.storage_object_shop_id(name),
    array['OWNER']::public.shop_role[]
  ))
);

create policy shop_assets_delete_owner
on storage.objects for delete to authenticated
using (
  bucket_id = 'shop-assets'
  and (select app_private.is_active_shop_member(
    app_private.storage_object_shop_id(name),
    array['OWNER']::public.shop_role[]
  ))
);

commit;
