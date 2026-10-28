begin;

create or replace function app_private.require_catalog_role(
  target_shop_id uuid,
  allowed_roles public.shop_role[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  if not app_private.is_active_shop_member(target_shop_id, allowed_roles) then
    raise exception using errcode = '42501', message = 'Insufficient catalog permission.';
  end if;
end;
$$;

create or replace function app_private.write_catalog_audit(
  target_shop_id uuid,
  target_action text,
  target_entity_type text,
  target_entity_id uuid,
  target_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
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
    target_action,
    target_entity_type,
    target_entity_id,
    coalesce(target_metadata, '{}'::jsonb)
  );
$$;

create or replace function public.save_category(
  target_shop_id uuid,
  target_category_id uuid,
  category_name text,
  category_sort_order integer,
  category_is_visible boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  perform app_private.require_catalog_role(
    target_shop_id,
    array['OWNER']::public.shop_role[]
  );

  if target_category_id is null then
    insert into public.categories (shop_id, name, sort_order, is_visible)
    values (
      target_shop_id,
      btrim(category_name),
      category_sort_order,
      category_is_visible
    )
    returning id into saved_id;
  else
    update public.categories
    set name = btrim(category_name),
        sort_order = category_sort_order,
        is_visible = category_is_visible
    where id = target_category_id and shop_id = target_shop_id
    returning id into saved_id;

    if saved_id is null then
      raise exception using errcode = 'P0002', message = 'Category not found.';
    end if;
  end if;

  perform app_private.write_catalog_audit(
    target_shop_id,
    case when target_category_id is null then 'CATEGORY_CREATED' else 'CATEGORY_UPDATED' end,
    'category',
    saved_id,
    jsonb_build_object('name', btrim(category_name))
  );

  return saved_id;
end;
$$;

create or replace function public.delete_category(
  target_shop_id uuid,
  target_category_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_name text;
begin
  perform app_private.require_catalog_role(
    target_shop_id,
    array['OWNER']::public.shop_role[]
  );

  delete from public.categories
  where id = target_category_id and shop_id = target_shop_id
  returning name into deleted_name;

  if deleted_name is null then
    raise exception using errcode = 'P0002', message = 'Category not found.';
  end if;

  perform app_private.write_catalog_audit(
    target_shop_id,
    'CATEGORY_DELETED',
    'category',
    target_category_id,
    jsonb_build_object('name', deleted_name)
  );
end;
$$;

create or replace function public.save_product(
  target_shop_id uuid,
  target_product_id uuid,
  target_category_id uuid,
  product_name text,
  product_description text,
  product_base_price_satang integer,
  product_sort_order integer,
  product_is_visible boolean,
  product_is_available boolean,
  product_image_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  perform app_private.require_catalog_role(
    target_shop_id,
    array['OWNER']::public.shop_role[]
  );

  if not exists (
    select 1 from public.categories
    where id = target_category_id and shop_id = target_shop_id
  ) then
    raise exception using errcode = '23503', message = 'Category does not belong to this shop.';
  end if;

  if target_product_id is null then
    insert into public.products (
      shop_id,
      category_id,
      name,
      description,
      base_price_satang,
      sort_order,
      is_visible,
      is_available,
      image_path
    )
    values (
      target_shop_id,
      target_category_id,
      btrim(product_name),
      btrim(product_description),
      product_base_price_satang,
      product_sort_order,
      product_is_visible,
      product_is_available,
      nullif(btrim(product_image_path), '')
    )
    returning id into saved_id;
  else
    update public.products
    set category_id = target_category_id,
        name = btrim(product_name),
        description = btrim(product_description),
        base_price_satang = product_base_price_satang,
        sort_order = product_sort_order,
        is_visible = product_is_visible,
        is_available = product_is_available,
        image_path = nullif(btrim(product_image_path), '')
    where id = target_product_id and shop_id = target_shop_id
    returning id into saved_id;

    if saved_id is null then
      raise exception using errcode = 'P0002', message = 'Product not found.';
    end if;
  end if;

  perform app_private.write_catalog_audit(
    target_shop_id,
    case when target_product_id is null then 'PRODUCT_CREATED' else 'PRODUCT_UPDATED' end,
    'product',
    saved_id,
    jsonb_build_object('name', btrim(product_name))
  );

  return saved_id;
end;
$$;

create or replace function public.delete_product(
  target_shop_id uuid,
  target_product_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_name text;
begin
  perform app_private.require_catalog_role(
    target_shop_id,
    array['OWNER']::public.shop_role[]
  );

  delete from public.products
  where id = target_product_id and shop_id = target_shop_id
  returning name into deleted_name;

  if deleted_name is null then
    raise exception using errcode = 'P0002', message = 'Product not found.';
  end if;

  perform app_private.write_catalog_audit(
    target_shop_id,
    'PRODUCT_DELETED',
    'product',
    target_product_id,
    jsonb_build_object('name', deleted_name)
  );
end;
$$;

create or replace function public.set_product_image(
  target_shop_id uuid,
  target_product_id uuid,
  product_image_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_catalog_role(
    target_shop_id,
    array['OWNER']::public.shop_role[]
  );

  update public.products
  set image_path = nullif(btrim(product_image_path), '')
  where id = target_product_id and shop_id = target_shop_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Product not found.';
  end if;

  perform app_private.write_catalog_audit(
    target_shop_id,
    'PRODUCT_IMAGE_CHANGED',
    'product',
    target_product_id,
    jsonb_build_object('has_image', product_image_path is not null)
  );
end;
$$;

create or replace function public.set_product_availability(
  target_shop_id uuid,
  target_product_id uuid,
  product_is_available boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_catalog_role(
    target_shop_id,
    array['OWNER', 'STAFF']::public.shop_role[]
  );

  update public.products
  set is_available = product_is_available
  where id = target_product_id and shop_id = target_shop_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Product not found.';
  end if;

  perform app_private.write_catalog_audit(
    target_shop_id,
    'PRODUCT_AVAILABILITY_CHANGED',
    'product',
    target_product_id,
    jsonb_build_object('is_available', product_is_available)
  );
end;
$$;

create or replace function public.save_option_group(
  target_shop_id uuid,
  target_option_group_id uuid,
  target_product_id uuid,
  option_group_name text,
  option_group_min_select integer,
  option_group_max_select integer,
  option_group_sort_order integer,
  option_group_is_visible boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  perform app_private.require_catalog_role(
    target_shop_id,
    array['OWNER']::public.shop_role[]
  );

  if not exists (
    select 1 from public.products
    where id = target_product_id and shop_id = target_shop_id
  ) then
    raise exception using errcode = '23503', message = 'Product does not belong to this shop.';
  end if;

  if target_option_group_id is null then
    insert into public.option_groups (
      shop_id,
      product_id,
      name,
      min_select,
      max_select,
      sort_order,
      is_visible
    )
    values (
      target_shop_id,
      target_product_id,
      btrim(option_group_name),
      option_group_min_select,
      option_group_max_select,
      option_group_sort_order,
      option_group_is_visible
    )
    returning id into saved_id;
  else
    update public.option_groups
    set product_id = target_product_id,
        name = btrim(option_group_name),
        min_select = option_group_min_select,
        max_select = option_group_max_select,
        sort_order = option_group_sort_order,
        is_visible = option_group_is_visible
    where id = target_option_group_id and shop_id = target_shop_id
    returning id into saved_id;

    if saved_id is null then
      raise exception using errcode = 'P0002', message = 'Option group not found.';
    end if;
  end if;

  perform app_private.write_catalog_audit(
    target_shop_id,
    case when target_option_group_id is null then 'OPTION_GROUP_CREATED' else 'OPTION_GROUP_UPDATED' end,
    'option_group',
    saved_id,
    jsonb_build_object('name', btrim(option_group_name), 'product_id', target_product_id)
  );

  return saved_id;
end;
$$;

create or replace function public.delete_option_group(
  target_shop_id uuid,
  target_option_group_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_catalog_role(
    target_shop_id,
    array['OWNER']::public.shop_role[]
  );

  delete from public.option_groups
  where id = target_option_group_id and shop_id = target_shop_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Option group not found.';
  end if;

  perform app_private.write_catalog_audit(
    target_shop_id,
    'OPTION_GROUP_DELETED',
    'option_group',
    target_option_group_id
  );
end;
$$;

create or replace function public.save_product_option(
  target_shop_id uuid,
  target_product_option_id uuid,
  target_option_group_id uuid,
  option_name text,
  option_price_delta_satang integer,
  option_sort_order integer,
  option_is_visible boolean,
  option_is_available boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  perform app_private.require_catalog_role(
    target_shop_id,
    array['OWNER']::public.shop_role[]
  );

  if not exists (
    select 1 from public.option_groups
    where id = target_option_group_id and shop_id = target_shop_id
  ) then
    raise exception using errcode = '23503', message = 'Option group does not belong to this shop.';
  end if;

  if target_product_option_id is null then
    insert into public.product_options (
      shop_id,
      option_group_id,
      name,
      price_delta_satang,
      sort_order,
      is_visible,
      is_available
    )
    values (
      target_shop_id,
      target_option_group_id,
      btrim(option_name),
      option_price_delta_satang,
      option_sort_order,
      option_is_visible,
      option_is_available
    )
    returning id into saved_id;
  else
    update public.product_options
    set option_group_id = target_option_group_id,
        name = btrim(option_name),
        price_delta_satang = option_price_delta_satang,
        sort_order = option_sort_order,
        is_visible = option_is_visible,
        is_available = option_is_available
    where id = target_product_option_id and shop_id = target_shop_id
    returning id into saved_id;

    if saved_id is null then
      raise exception using errcode = 'P0002', message = 'Product option not found.';
    end if;
  end if;

  perform app_private.write_catalog_audit(
    target_shop_id,
    case when target_product_option_id is null then 'PRODUCT_OPTION_CREATED' else 'PRODUCT_OPTION_UPDATED' end,
    'product_option',
    saved_id,
    jsonb_build_object('name', btrim(option_name), 'option_group_id', target_option_group_id)
  );

  return saved_id;
end;
$$;

create or replace function public.delete_product_option(
  target_shop_id uuid,
  target_product_option_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_catalog_role(
    target_shop_id,
    array['OWNER']::public.shop_role[]
  );

  delete from public.product_options
  where id = target_product_option_id and shop_id = target_shop_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Product option not found.';
  end if;

  perform app_private.write_catalog_audit(
    target_shop_id,
    'PRODUCT_OPTION_DELETED',
    'product_option',
    target_product_option_id
  );
end;
$$;

create or replace function public.set_product_option_availability(
  target_shop_id uuid,
  target_product_option_id uuid,
  option_is_available boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_catalog_role(
    target_shop_id,
    array['OWNER', 'STAFF']::public.shop_role[]
  );

  update public.product_options
  set is_available = option_is_available
  where id = target_product_option_id and shop_id = target_shop_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Product option not found.';
  end if;

  perform app_private.write_catalog_audit(
    target_shop_id,
    'PRODUCT_OPTION_AVAILABILITY_CHANGED',
    'product_option',
    target_product_option_id,
    jsonb_build_object('is_available', option_is_available)
  );
end;
$$;

revoke execute on function app_private.require_catalog_role(uuid, public.shop_role[])
  from public, anon, authenticated;
revoke execute on function app_private.write_catalog_audit(uuid, text, text, uuid, jsonb)
  from public, anon, authenticated;

commit;
