begin;

alter table public.topping_groups
  add column selection_mode text not null default 'SINGLE'
    check (selection_mode in ('SINGLE', 'MULTIPLE')),
  add column is_required boolean not null default false,
  add column pricing_mode text not null default 'PER_TOPPING'
    check (pricing_mode in ('PER_TOPPING', 'FIRST_FREE_THEN_FIXED')),
  add column additional_selection_price_satang integer not null default 0
    check (additional_selection_price_satang >= 0),
  add constraint topping_groups_first_free_multiple_only check (
    pricing_mode <> 'FIRST_FREE_THEN_FIXED' or selection_mode = 'MULTIPLE'
  );

alter table public.option_groups
  add column selection_mode text not null default 'SINGLE'
    check (selection_mode in ('SINGLE', 'MULTIPLE')),
  add column is_required boolean not null default false,
  add column pricing_mode text not null default 'PER_TOPPING'
    check (pricing_mode in ('PER_TOPPING', 'FIRST_FREE_THEN_FIXED')),
  add column additional_selection_price_satang integer not null default 0
    check (additional_selection_price_satang >= 0),
  add constraint option_groups_first_free_multiple_only check (
    pricing_mode <> 'FIRST_FREE_THEN_FIXED' or selection_mode = 'MULTIPLE'
  );

update public.topping_groups
set selection_mode = case when max_select = 1 then 'SINGLE' else 'MULTIPLE' end,
    is_required = min_select > 0;

update public.option_groups
set selection_mode = case when max_select = 1 then 'SINGLE' else 'MULTIPLE' end,
    is_required = min_select > 0;

create or replace function app_private.sync_topping_group(target_topping_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  group_row public.topping_groups;
  product_row record;
  topping_row public.toppings;
  clone_group_id uuid;
  derived_max_select integer;
begin
  select * into group_row from public.topping_groups where id = target_topping_group_id;
  if group_row.id is null then
    raise exception using errcode = 'P0002', message = 'Topping group not found.';
  end if;

  select case
    when group_row.selection_mode = 'SINGLE' then 1
    else greatest(count(*)::integer, 1)
  end into derived_max_select
  from public.toppings
  where topping_group_id = group_row.id and is_visible;

  update public.option_groups set is_visible = false where topping_group_id = group_row.id;

  for product_row in
    select product.id
    from public.products as product
    join public.category_topping_groups as mapping
      on mapping.shop_id = product.shop_id
     and mapping.category_id = product.category_id
     and mapping.topping_group_id = group_row.id
    where product.shop_id = group_row.shop_id
    order by product.id
  loop
    select id into clone_group_id
    from public.option_groups
    where product_id = product_row.id and topping_group_id = group_row.id
    for update;

    if clone_group_id is null then
      insert into public.option_groups (
        shop_id, product_id, topping_group_id, name, min_select, max_select,
        selection_mode, is_required, pricing_mode, additional_selection_price_satang,
        sort_order, is_visible
      ) values (
        group_row.shop_id, product_row.id, group_row.id, group_row.name,
        case when group_row.is_required then 1 else 0 end, derived_max_select,
        group_row.selection_mode, group_row.is_required, group_row.pricing_mode,
        group_row.additional_selection_price_satang, group_row.sort_order, group_row.is_visible
      ) returning id into clone_group_id;
    else
      update public.option_groups
      set name = group_row.name,
          min_select = case when group_row.is_required then 1 else 0 end,
          max_select = derived_max_select,
          selection_mode = group_row.selection_mode,
          is_required = group_row.is_required,
          pricing_mode = group_row.pricing_mode,
          additional_selection_price_satang = group_row.additional_selection_price_satang,
          sort_order = group_row.sort_order,
          is_visible = group_row.is_visible
      where id = clone_group_id;
    end if;

    update public.product_options
    set is_visible = false, is_available = false
    where option_group_id = clone_group_id and topping_id is not null;

    for topping_row in
      select * from public.toppings
      where topping_group_id = group_row.id
      order by sort_order, name, id
    loop
      insert into public.product_options (
        shop_id, option_group_id, topping_id, name, price_delta_satang,
        sort_order, is_visible, is_available
      ) values (
        group_row.shop_id, clone_group_id, topping_row.id, topping_row.name,
        case when group_row.pricing_mode = 'FIRST_FREE_THEN_FIXED' then 0 else topping_row.price_delta_satang end,
        topping_row.sort_order, topping_row.is_visible, topping_row.is_available
      )
      on conflict (option_group_id, topping_id) where topping_id is not null
      do update set
        name = excluded.name,
        price_delta_satang = excluded.price_delta_satang,
        sort_order = excluded.sort_order,
        is_visible = excluded.is_visible,
        is_available = excluded.is_available;
    end loop;
  end loop;
end;
$$;

drop function public.save_topping_group(uuid, uuid, text, integer, integer, boolean, uuid[]);

create or replace function public.save_topping_group(
  target_shop_id uuid,
  target_topping_group_id uuid,
  topping_group_name text,
  topping_group_selection_mode text,
  topping_group_is_required boolean,
  topping_group_pricing_mode text,
  topping_group_additional_price_satang integer,
  topping_group_is_visible boolean,
  selected_category_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  saved_sort_order integer;
  requested_category_count integer;
  valid_category_count integer;
begin
  perform app_private.require_catalog_role(target_shop_id, array['OWNER']::public.shop_role[]);
  if topping_group_selection_mode not in ('SINGLE', 'MULTIPLE')
     or topping_group_pricing_mode not in ('PER_TOPPING', 'FIRST_FREE_THEN_FIXED')
     or (topping_group_pricing_mode = 'FIRST_FREE_THEN_FIXED' and topping_group_selection_mode <> 'MULTIPLE')
     or topping_group_additional_price_satang < 0 then
    raise exception using errcode = '22023', message = 'Invalid topping selection or pricing rule.';
  end if;

  select count(distinct value)::integer into requested_category_count
  from unnest(coalesce(selected_category_ids, '{}'::uuid[])) as value;
  if requested_category_count = 0 then
    raise exception using errcode = '22023', message = 'Select at least one menu category.';
  end if;
  select count(*)::integer into valid_category_count
  from public.categories where shop_id = target_shop_id and id = any(selected_category_ids);
  if valid_category_count <> requested_category_count then
    raise exception using errcode = '23503', message = 'A selected category does not belong to this shop.';
  end if;

  if target_topping_group_id is null then
    select coalesce(max(sort_order), -1) + 1 into saved_sort_order
    from public.topping_groups where shop_id = target_shop_id;
    insert into public.topping_groups (
      shop_id, name, min_select, max_select, selection_mode, is_required,
      pricing_mode, additional_selection_price_satang, sort_order, is_visible
    ) values (
      target_shop_id, btrim(topping_group_name), case when topping_group_is_required then 1 else 0 end,
      1, topping_group_selection_mode, topping_group_is_required, topping_group_pricing_mode,
      topping_group_additional_price_satang, saved_sort_order, topping_group_is_visible
    ) returning id into saved_id;
  else
    update public.topping_groups
    set name = btrim(topping_group_name),
        min_select = case when topping_group_is_required then 1 else 0 end,
        max_select = case when topping_group_selection_mode = 'SINGLE' then 1 else greatest(max_select, 1) end,
        selection_mode = topping_group_selection_mode,
        is_required = topping_group_is_required,
        pricing_mode = topping_group_pricing_mode,
        additional_selection_price_satang = topping_group_additional_price_satang,
        is_visible = topping_group_is_visible
    where id = target_topping_group_id and shop_id = target_shop_id
    returning id into saved_id;
    if saved_id is null then raise exception using errcode = 'P0002', message = 'Topping group not found.'; end if;
  end if;

  delete from public.category_topping_groups where topping_group_id = saved_id;
  insert into public.category_topping_groups (shop_id, category_id, topping_group_id)
  select target_shop_id, value, saved_id
  from (select distinct value from unnest(selected_category_ids) as value) as selected;

  perform app_private.sync_topping_group(saved_id);
  perform app_private.write_catalog_audit(
    target_shop_id,
    case when target_topping_group_id is null then 'TOPPING_GROUP_CREATED' else 'TOPPING_GROUP_UPDATED' end,
    'topping_group', saved_id,
    jsonb_build_object('name', btrim(topping_group_name), 'category_count', requested_category_count,
      'selection_mode', topping_group_selection_mode, 'pricing_mode', topping_group_pricing_mode)
  );
  return saved_id;
end;
$$;

create or replace function app_private.get_priced_product_options(
  target_product_id uuid,
  selected_option_ids uuid[]
)
returns table (
  product_option_id uuid,
  option_name text,
  effective_price_delta_satang integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with selected as (
    select product_option.id,
      product_option.name,
      product_option.price_delta_satang,
      option_group.id as option_group_id,
      option_group.pricing_mode,
      option_group.additional_selection_price_satang,
      row_number() over (
        partition by option_group.id
        order by product_option.sort_order, product_option.name, product_option.id
      ) as selected_rank
    from public.product_options as product_option
    join public.option_groups as option_group on option_group.id = product_option.option_group_id
    where option_group.product_id = target_product_id
      and product_option.id = any(coalesce(selected_option_ids, '{}'::uuid[]))
  )
  select id, name,
    case when pricing_mode = 'FIRST_FREE_THEN_FIXED'
      then case when selected_rank = 1 then 0 else additional_selection_price_satang end
      else price_delta_satang
    end::integer
  from selected;
$$;

revoke execute on function app_private.get_priced_product_options(uuid, uuid[]) from public, anon, authenticated;

create or replace function public.get_topping_library(target_shop_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app_private.require_catalog_role(target_shop_id, array['OWNER', 'STAFF']::public.shop_role[]);
  return jsonb_build_object(
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', category.id, 'name', category.name)
        order by category.sort_order, category.name)
      from public.categories as category where category.shop_id = target_shop_id
    ), '[]'::jsonb),
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', topping_group.id,
        'name', topping_group.name,
        'minSelect', case when topping_group.is_required then 1 else 0 end,
        'maxSelect', case when topping_group.selection_mode = 'SINGLE' then 1 else greatest(topping_group.max_select, 1) end,
        'selectionMode', topping_group.selection_mode,
        'isRequired', topping_group.is_required,
        'pricingMode', topping_group.pricing_mode,
        'additionalSelectionPriceSatang', topping_group.additional_selection_price_satang,
        'sortOrder', topping_group.sort_order,
        'isVisible', topping_group.is_visible,
        'categoryIds', coalesce((
          select jsonb_agg(mapping.category_id order by category.sort_order, category.name)
          from public.category_topping_groups as mapping
          join public.categories as category on category.id = mapping.category_id
          where mapping.topping_group_id = topping_group.id
        ), '[]'::jsonb),
        'toppings', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', topping.id,
            'groupId', topping.topping_group_id,
            'name', topping.name,
            'priceDeltaSatang', topping.price_delta_satang,
            'sortOrder', topping.sort_order,
            'isVisible', topping.is_visible,
            'isAvailable', topping.is_available
          ) order by topping.sort_order, topping.name)
          from public.toppings as topping where topping.topping_group_id = topping_group.id
        ), '[]'::jsonb)
      ) order by topping_group.sort_order, topping_group.name)
      from public.topping_groups as topping_group where topping_group.shop_id = target_shop_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_public_menu(target_shop_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'shopId', shop.id,
    'shopName', shop.name,
    'logoPath', shop.logo_path,
    'currencyCode', shop.currency_code,
    'isOpen', exists (
      select 1 from public.store_sessions as session
      where session.shop_id = shop.id and session.status = 'OPEN'
    ),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', category.id,
        'name', category.name,
        'products', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', product.id,
            'name', product.name,
            'description', product.description,
            'basePriceSatang', product.base_price_satang,
            'imagePath', product.image_path,
            'isAvailable', product.is_available,
            'optionGroups', coalesce((
              select jsonb_agg(jsonb_build_object(
                'id', option_group.id,
                'name', option_group.name,
                'minSelect', option_group.min_select,
                'maxSelect', option_group.max_select,
                'selectionMode', option_group.selection_mode,
                'isRequired', option_group.is_required,
                'pricingMode', option_group.pricing_mode,
                'additionalSelectionPriceSatang', option_group.additional_selection_price_satang,
                'options', coalesce((
                  select jsonb_agg(jsonb_build_object(
                    'id', product_option.id,
                    'name', product_option.name,
                    'priceDeltaSatang', product_option.price_delta_satang,
                    'isAvailable', product_option.is_available
                  ) order by product_option.sort_order, product_option.name)
                  from public.product_options as product_option
                  where product_option.shop_id = shop.id
                    and product_option.option_group_id = option_group.id
                    and product_option.is_visible
                ), '[]'::jsonb)
              ) order by option_group.sort_order, option_group.name)
              from public.option_groups as option_group
              where option_group.shop_id = shop.id
                and option_group.product_id = product.id
                and option_group.is_visible
            ), '[]'::jsonb)
          ) order by product.sort_order, product.name)
          from public.products as product
          where product.shop_id = shop.id and product.category_id = category.id and product.is_visible
        ), '[]'::jsonb)
      ) order by category.sort_order, category.name)
      from public.categories as category
      where category.shop_id = shop.id and category.is_visible
    ), '[]'::jsonb)
  )
  from public.shops as shop where shop.id = target_shop_id;
$$;

create or replace function public.save_topping(
  target_shop_id uuid,
  target_topping_id uuid,
  target_topping_group_id uuid,
  topping_name text,
  topping_price_delta_satang integer,
  topping_is_visible boolean,
  topping_is_available boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  saved_sort_order integer;
  saved_price integer;
begin
  perform app_private.require_catalog_role(target_shop_id, array['OWNER']::public.shop_role[]);
  select case when pricing_mode = 'FIRST_FREE_THEN_FIXED' then 0 else topping_price_delta_satang end
  into saved_price
  from public.topping_groups
  where id = target_topping_group_id and shop_id = target_shop_id;
  if saved_price is null then
    raise exception using errcode = '23503', message = 'Topping group does not belong to this shop.';
  end if;
  if topping_price_delta_satang < 0 then
    raise exception using errcode = '22023', message = 'Topping price cannot be negative.';
  end if;

  if target_topping_id is null then
    select coalesce(max(sort_order), -1) + 1 into saved_sort_order
    from public.toppings where topping_group_id = target_topping_group_id;
    insert into public.toppings (
      shop_id, topping_group_id, name, price_delta_satang, sort_order, is_visible, is_available
    ) values (
      target_shop_id, target_topping_group_id, btrim(topping_name), saved_price,
      saved_sort_order, topping_is_visible, topping_is_available
    ) returning id into saved_id;
  else
    update public.toppings
    set name = btrim(topping_name), price_delta_satang = saved_price,
        is_visible = topping_is_visible, is_available = topping_is_available
    where id = target_topping_id and shop_id = target_shop_id
      and topping_group_id = target_topping_group_id
    returning id into saved_id;
    if saved_id is null then raise exception using errcode = 'P0002', message = 'Topping not found.'; end if;
  end if;

  perform app_private.sync_topping_group(target_topping_group_id);
  perform app_private.write_catalog_audit(
    target_shop_id,
    case when target_topping_id is null then 'TOPPING_CREATED' else 'TOPPING_UPDATED' end,
    'topping', saved_id, jsonb_build_object('name', btrim(topping_name), 'group_id', target_topping_group_id)
  );
  return saved_id;
end;
$$;

create or replace function public.create_qr_order(
  target_shop_id uuid,
  request_idempotency_key uuid,
  request_tracking_token uuid,
  customer_latitude double precision,
  customer_longitude double precision,
  customer_accuracy_m double precision,
  location_captured_at timestamptz,
  cart_items jsonb,
  order_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_session public.store_sessions;
  shop_location public.shop_locations;
  existing_order public.orders;
  product_row public.products;
  cart_item jsonb;
  option_group_row public.option_groups;
  selected_option_ids uuid[];
  selected_count integer;
  item_quantity integer;
  item_note text;
  unit_price integer;
  subtotal integer := 0;
  queue_value integer;
  new_order public.orders;
  new_item_id uuid;
  location_distance double precision;
  token_hash text := encode(extensions.digest(request_tracking_token::text, 'sha256'), 'hex');
begin
  if cart_items is null or jsonb_typeof(cart_items) <> 'array'
    or jsonb_array_length(cart_items) not between 1 and 30 then
    raise exception using errcode = '22023', message = 'Cart must contain 1 to 30 lines.';
  end if;
  if order_note is null or char_length(order_note) > 500 then
    raise exception using errcode = '22023', message = 'Order note is too long.';
  end if;

  select * into existing_order from public.orders
  where shop_id = target_shop_id and idempotency_key = request_idempotency_key;
  if existing_order.id is not null then
    if existing_order.tracking_token_hash <> token_hash then
      raise exception using errcode = '23505', message = 'Idempotency key is already associated with another tracking token.';
    end if;
    return jsonb_build_object(
      'orderId', existing_order.id, 'queueNumber', existing_order.queue_number,
      'orderReference', existing_order.order_reference, 'trackingToken', request_tracking_token,
      'status', existing_order.status, 'totalSatang', existing_order.total_satang
    );
  end if;

  select * into active_session from public.store_sessions
  where shop_id = target_shop_id and status = 'OPEN' for share;
  if active_session.id is null then
    raise exception using errcode = 'P0001', message = 'Shop is closed.';
  end if;
  select * into shop_location from public.shop_locations where shop_id = target_shop_id;
  if shop_location.id is null then
    raise exception using errcode = 'P0001', message = 'Shop location is not configured.';
  end if;
  if customer_accuracy_m is null or customer_accuracy_m < 0 or customer_accuracy_m > 100 then
    raise exception using errcode = '22023', message = 'Location accuracy must be within 100 meters.';
  end if;
  if location_captured_at is null
    or location_captured_at < now() - interval '60 seconds'
    or location_captured_at > now() + interval '10 seconds' then
    raise exception using errcode = '22023', message = 'Location reading is stale or invalid.';
  end if;
  location_distance := app_private.distance_meters(
    customer_latitude, customer_longitude,
    shop_location.latitude::double precision, shop_location.longitude::double precision
  );
  if location_distance > shop_location.geofence_radius_m then
    raise exception using errcode = '42501', message = 'Customer is outside the ordering area.';
  end if;

  for cart_item in select value from jsonb_array_elements(cart_items)
  loop
    if jsonb_typeof(cart_item) <> 'object' then
      raise exception using errcode = '22023', message = 'Invalid cart line.';
    end if;
    item_quantity := (cart_item ->> 'quantity')::integer;
    item_note := coalesce(cart_item ->> 'note', '');
    if item_quantity not between 1 and 20 or char_length(item_note) > 300 then
      raise exception using errcode = '22023', message = 'Invalid quantity or item note.';
    end if;
    select * into product_row from public.products
    where id = (cart_item ->> 'productId')::uuid
      and shop_id = target_shop_id and is_visible and is_available;
    if product_row.id is null then
      raise exception using errcode = 'P0002', message = 'A product is unavailable.';
    end if;
    select coalesce(array_agg(distinct value::uuid), array[]::uuid[])
    into selected_option_ids
    from jsonb_array_elements_text(coalesce(cart_item -> 'optionIds', '[]'::jsonb));

    for option_group_row in
      select * from public.option_groups
      where shop_id = target_shop_id and product_id = product_row.id and is_visible
    loop
      select count(*) into selected_count from public.product_options
      where id = any(selected_option_ids) and option_group_id = option_group_row.id
        and shop_id = target_shop_id and is_visible and is_available;
      if selected_count < option_group_row.min_select or selected_count > option_group_row.max_select then
        raise exception using errcode = '22023', message = 'Product option selection is invalid.';
      end if;
    end loop;

    if exists (
      select 1 from unnest(selected_option_ids) as selected_id
      where not exists (
        select 1 from public.product_options as selected_option
        join public.option_groups as selected_group on selected_group.id = selected_option.option_group_id
        where selected_option.id = selected_id and selected_option.shop_id = target_shop_id
          and selected_option.is_visible and selected_option.is_available
          and selected_group.product_id = product_row.id and selected_group.is_visible
      )
    ) then
      raise exception using errcode = '22023', message = 'A selected option is invalid or unavailable.';
    end if;

    select product_row.base_price_satang + coalesce(sum(effective_price_delta_satang), 0)
    into unit_price
    from app_private.get_priced_product_options(product_row.id, selected_option_ids);
    subtotal := subtotal + (unit_price * item_quantity);
  end loop;

  insert into public.queue_counters (shop_id, business_date, last_number)
  values (target_shop_id, active_session.business_date, 1)
  on conflict (shop_id, business_date) do update
  set last_number = public.queue_counters.last_number + 1, updated_at = now()
  returning last_number into queue_value;

  insert into public.orders (
    shop_id, store_session_id, business_date, queue_number, order_reference,
    source, status, payment_status, subtotal_satang, total_satang,
    customer_note, idempotency_key, tracking_token_hash, location_accuracy_m, location_distance_m
  ) values (
    target_shop_id, active_session.id, active_session.business_date, queue_value,
    'DP-' || to_char(active_session.business_date, 'YYYYMMDD') || '-' || lpad(queue_value::text, 3, '0'),
    'QR', 'QUEUED', 'UNPAID', subtotal, subtotal, btrim(order_note), request_idempotency_key,
    token_hash, customer_accuracy_m, location_distance
  ) returning * into new_order;

  for cart_item in select value from jsonb_array_elements(cart_items)
  loop
    select * into product_row from public.products where id = (cart_item ->> 'productId')::uuid;
    item_quantity := (cart_item ->> 'quantity')::integer;
    item_note := coalesce(cart_item ->> 'note', '');
    select coalesce(array_agg(distinct value::uuid), array[]::uuid[])
    into selected_option_ids
    from jsonb_array_elements_text(coalesce(cart_item -> 'optionIds', '[]'::jsonb));
    select product_row.base_price_satang + coalesce(sum(effective_price_delta_satang), 0)
    into unit_price
    from app_private.get_priced_product_options(product_row.id, selected_option_ids);

    insert into public.order_items (
      order_id, product_id, product_name, unit_price_satang, quantity, item_note, line_total_satang
    ) values (
      new_order.id, product_row.id, product_row.name, unit_price,
      item_quantity, item_note, unit_price * item_quantity
    ) returning id into new_item_id;

    insert into public.order_item_options (
      order_item_id, product_option_id, option_name, price_delta_satang
    )
    select new_item_id, product_option_id, option_name, effective_price_delta_satang
    from app_private.get_priced_product_options(product_row.id, selected_option_ids);
  end loop;

  insert into public.order_events (order_id, shop_id, from_status, to_status, metadata)
  values (new_order.id, target_shop_id, null, 'QUEUED', jsonb_build_object('source', 'QR'));
  return jsonb_build_object(
    'orderId', new_order.id, 'queueNumber', new_order.queue_number,
    'orderReference', new_order.order_reference, 'trackingToken', request_tracking_token,
    'status', new_order.status, 'totalSatang', new_order.total_satang
  );
end;
$$;

create or replace function public.create_pos_order(
  target_shop_id uuid,
  request_idempotency_key uuid,
  cart_items jsonb,
  order_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_session public.store_sessions;
  existing_order public.orders;
  product_row public.products;
  cart_item jsonb;
  option_group_row public.option_groups;
  selected_option_ids uuid[];
  selected_count integer;
  item_quantity integer;
  item_note text;
  unit_price integer;
  subtotal integer := 0;
  queue_value integer;
  new_order public.orders;
  new_item_id uuid;
begin
  if not app_private.is_active_shop_member(target_shop_id) then
    raise exception using errcode = '42501', message = 'Active shop membership is required.';
  end if;
  if cart_items is null or jsonb_typeof(cart_items) <> 'array'
    or jsonb_array_length(cart_items) not between 1 and 30 then
    raise exception using errcode = '22023', message = 'Cart must contain 1 to 30 lines.';
  end if;
  if order_note is null or char_length(order_note) > 500 then
    raise exception using errcode = '22023', message = 'Order note is too long.';
  end if;

  select * into existing_order from public.orders
  where shop_id = target_shop_id and idempotency_key = request_idempotency_key;
  if existing_order.id is not null then
    return jsonb_build_object(
      'orderId', existing_order.id, 'queueNumber', existing_order.queue_number,
      'orderReference', existing_order.order_reference, 'status', existing_order.status,
      'totalSatang', existing_order.total_satang
    );
  end if;

  select * into active_session from public.store_sessions
  where shop_id = target_shop_id and status = 'OPEN' for share;
  if active_session.id is null then
    raise exception using errcode = 'P0001', message = 'Shop is closed.';
  end if;

  for cart_item in select value from jsonb_array_elements(cart_items)
  loop
    item_quantity := (cart_item ->> 'quantity')::integer;
    item_note := coalesce(cart_item ->> 'note', '');
    if item_quantity not between 1 and 20 or char_length(item_note) > 300 then
      raise exception using errcode = '22023', message = 'Invalid quantity or item note.';
    end if;
    select * into product_row from public.products
    where id = (cart_item ->> 'productId')::uuid
      and shop_id = target_shop_id and is_visible and is_available;
    if product_row.id is null then
      raise exception using errcode = 'P0002', message = 'A product is unavailable.';
    end if;
    select coalesce(array_agg(distinct value::uuid), array[]::uuid[])
    into selected_option_ids
    from jsonb_array_elements_text(coalesce(cart_item -> 'optionIds', '[]'::jsonb));

    for option_group_row in
      select * from public.option_groups
      where shop_id = target_shop_id and product_id = product_row.id and is_visible
    loop
      select count(*) into selected_count from public.product_options
      where id = any(selected_option_ids) and option_group_id = option_group_row.id
        and shop_id = target_shop_id and is_visible and is_available;
      if selected_count < option_group_row.min_select or selected_count > option_group_row.max_select then
        raise exception using errcode = '22023', message = 'Product option selection is invalid.';
      end if;
    end loop;

    if exists (
      select 1 from unnest(selected_option_ids) as selected_id
      where not exists (
        select 1 from public.product_options as selected_option
        join public.option_groups as selected_group on selected_group.id = selected_option.option_group_id
        where selected_option.id = selected_id and selected_option.shop_id = target_shop_id
          and selected_option.is_visible and selected_option.is_available
          and selected_group.product_id = product_row.id and selected_group.is_visible
      )
    ) then
      raise exception using errcode = '22023', message = 'A selected option is invalid or unavailable.';
    end if;

    select product_row.base_price_satang + coalesce(sum(effective_price_delta_satang), 0)
    into unit_price
    from app_private.get_priced_product_options(product_row.id, selected_option_ids);
    subtotal := subtotal + (unit_price * item_quantity);
  end loop;

  insert into public.queue_counters (shop_id, business_date, last_number)
  values (target_shop_id, active_session.business_date, 1)
  on conflict (shop_id, business_date) do update
  set last_number = public.queue_counters.last_number + 1, updated_at = now()
  returning last_number into queue_value;

  insert into public.orders (
    shop_id, store_session_id, business_date, queue_number, order_reference,
    source, status, payment_status, subtotal_satang, total_satang,
    customer_note, idempotency_key, tracking_token_hash
  ) values (
    target_shop_id, active_session.id, active_session.business_date, queue_value,
    'DP-' || to_char(active_session.business_date, 'YYYYMMDD') || '-' || lpad(queue_value::text, 3, '0'),
    'POS', 'QUEUED', 'UNPAID', subtotal, subtotal, btrim(order_note), request_idempotency_key,
    encode(extensions.digest(extensions.gen_random_uuid()::text, 'sha256'), 'hex')
  ) returning * into new_order;

  for cart_item in select value from jsonb_array_elements(cart_items)
  loop
    select * into product_row from public.products where id = (cart_item ->> 'productId')::uuid;
    item_quantity := (cart_item ->> 'quantity')::integer;
    item_note := coalesce(cart_item ->> 'note', '');
    select coalesce(array_agg(distinct value::uuid), array[]::uuid[])
    into selected_option_ids
    from jsonb_array_elements_text(coalesce(cart_item -> 'optionIds', '[]'::jsonb));
    select product_row.base_price_satang + coalesce(sum(effective_price_delta_satang), 0)
    into unit_price
    from app_private.get_priced_product_options(product_row.id, selected_option_ids);

    insert into public.order_items (
      order_id, product_id, product_name, unit_price_satang, quantity, item_note, line_total_satang
    ) values (
      new_order.id, product_row.id, product_row.name, unit_price, item_quantity,
      btrim(item_note), unit_price * item_quantity
    ) returning id into new_item_id;
    insert into public.order_item_options (
      order_item_id, product_option_id, option_name, price_delta_satang
    )
    select new_item_id, product_option_id, option_name, effective_price_delta_satang
    from app_private.get_priced_product_options(product_row.id, selected_option_ids);
  end loop;

  insert into public.order_events (order_id, shop_id, from_status, to_status, actor_user_id, metadata)
  values (new_order.id, target_shop_id, null, 'QUEUED', auth.uid(), jsonb_build_object('source', 'POS'));
  insert into public.audit_logs (shop_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_shop_id, auth.uid(), 'POS_ORDER_CREATED', 'order', new_order.id,
    jsonb_build_object('queueNumber', new_order.queue_number, 'totalSatang', new_order.total_satang));
  return jsonb_build_object(
    'orderId', new_order.id, 'queueNumber', new_order.queue_number,
    'orderReference', new_order.order_reference, 'status', new_order.status,
    'totalSatang', new_order.total_satang
  );
end;
$$;

do $$
declare group_id uuid;
begin
  for group_id in select id from public.topping_groups loop
    perform app_private.sync_topping_group(group_id);
  end loop;
end;
$$;

revoke execute on function public.save_topping_group(uuid, uuid, text, text, boolean, text, integer, boolean, uuid[]) from public, anon;
grant execute on function public.save_topping_group(uuid, uuid, text, text, boolean, text, integer, boolean, uuid[]) to authenticated;

commit;

