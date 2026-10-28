begin;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.option_groups enable row level security;
alter table public.product_options enable row level security;

revoke all on table public.categories from anon, authenticated;
revoke all on table public.products from anon, authenticated;
revoke all on table public.option_groups from anon, authenticated;
revoke all on table public.product_options from anon, authenticated;

grant select on table public.categories to authenticated;
grant select on table public.products to authenticated;
grant select on table public.option_groups to authenticated;
grant select on table public.product_options to authenticated;

create policy categories_select_member
on public.categories for select to authenticated
using ((select app_private.is_active_shop_member(shop_id)));

create policy products_select_member
on public.products for select to authenticated
using ((select app_private.is_active_shop_member(shop_id)));

create policy option_groups_select_member
on public.option_groups for select to authenticated
using ((select app_private.is_active_shop_member(shop_id)));

create policy product_options_select_member
on public.product_options for select to authenticated
using ((select app_private.is_active_shop_member(shop_id)));

revoke execute on function app_private.require_catalog_role(uuid, public.shop_role[])
  from public, anon, authenticated;
revoke execute on function app_private.write_catalog_audit(uuid, text, text, uuid, jsonb)
  from public, anon, authenticated;

revoke execute on function public.save_category(uuid, uuid, text, integer, boolean)
  from public, anon;
revoke execute on function public.delete_category(uuid, uuid)
  from public, anon;
revoke execute on function public.save_product(uuid, uuid, uuid, text, text, integer, integer, boolean, boolean, text)
  from public, anon;
revoke execute on function public.delete_product(uuid, uuid)
  from public, anon;
revoke execute on function public.set_product_image(uuid, uuid, text)
  from public, anon;
revoke execute on function public.set_product_availability(uuid, uuid, boolean)
  from public, anon;
revoke execute on function public.save_option_group(uuid, uuid, uuid, text, integer, integer, integer, boolean)
  from public, anon;
revoke execute on function public.delete_option_group(uuid, uuid)
  from public, anon;
revoke execute on function public.save_product_option(uuid, uuid, uuid, text, integer, integer, boolean, boolean)
  from public, anon;
revoke execute on function public.delete_product_option(uuid, uuid)
  from public, anon;
revoke execute on function public.set_product_option_availability(uuid, uuid, boolean)
  from public, anon;

grant execute on function public.save_category(uuid, uuid, text, integer, boolean)
  to authenticated;
grant execute on function public.delete_category(uuid, uuid)
  to authenticated;
grant execute on function public.save_product(uuid, uuid, uuid, text, text, integer, integer, boolean, boolean, text)
  to authenticated;
grant execute on function public.delete_product(uuid, uuid)
  to authenticated;
grant execute on function public.set_product_image(uuid, uuid, text)
  to authenticated;
grant execute on function public.set_product_availability(uuid, uuid, boolean)
  to authenticated;
grant execute on function public.save_option_group(uuid, uuid, uuid, text, integer, integer, integer, boolean)
  to authenticated;
grant execute on function public.delete_option_group(uuid, uuid)
  to authenticated;
grant execute on function public.save_product_option(uuid, uuid, uuid, text, integer, integer, boolean, boolean)
  to authenticated;
grant execute on function public.delete_product_option(uuid, uuid)
  to authenticated;
grant execute on function public.set_product_option_availability(uuid, uuid, boolean)
  to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function app_private.storage_object_shop_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return split_part(object_name, '/', 1)::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

revoke execute on function app_private.storage_object_shop_id(text)
  from public, anon, authenticated;
grant execute on function app_private.storage_object_shop_id(text)
  to authenticated;

create policy product_images_insert_owner
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (select app_private.is_active_shop_member(
    app_private.storage_object_shop_id(name),
    array['OWNER']::public.shop_role[]
  ))
);

create policy product_images_update_owner
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and (select app_private.is_active_shop_member(
    app_private.storage_object_shop_id(name),
    array['OWNER']::public.shop_role[]
  ))
)
with check (
  bucket_id = 'product-images'
  and (select app_private.is_active_shop_member(
    app_private.storage_object_shop_id(name),
    array['OWNER']::public.shop_role[]
  ))
);

create policy product_images_delete_owner
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and (select app_private.is_active_shop_member(
    app_private.storage_object_shop_id(name),
    array['OWNER']::public.shop_role[]
  ))
);

commit;
