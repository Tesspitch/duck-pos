begin;

create or replace function app_private.distance_meters(
  latitude_a double precision,
  longitude_a double precision,
  latitude_b double precision,
  longitude_b double precision
)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 6371000 * 2 * asin(sqrt(
    power(sin(radians(latitude_b - latitude_a) / 2), 2)
    + cos(radians(latitude_a)) * cos(radians(latitude_b))
    * power(sin(radians(longitude_b - longitude_a) / 2), 2)
  ));
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
      select jsonb_agg(
        jsonb_build_object(
          'id', category.id,
          'name', category.name,
          'products', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', product.id,
                'name', product.name,
                'description', product.description,
                'basePriceSatang', product.base_price_satang,
                'imagePath', product.image_path,
                'isAvailable', product.is_available,
                'optionGroups', coalesce((
                  select jsonb_agg(
                    jsonb_build_object(
                      'id', option_group.id,
                      'name', option_group.name,
                      'minSelect', option_group.min_select,
                      'maxSelect', option_group.max_select,
                      'options', coalesce((
                        select jsonb_agg(
                          jsonb_build_object(
                            'id', product_option.id,
                            'name', product_option.name,
                            'priceDeltaSatang', product_option.price_delta_satang,
                            'isAvailable', product_option.is_available
                          ) order by product_option.sort_order, product_option.name
                        )
                        from public.product_options as product_option
                        where product_option.shop_id = shop.id
                          and product_option.option_group_id = option_group.id
                          and product_option.is_visible
                      ), '[]'::jsonb)
                    ) order by option_group.sort_order, option_group.name
                  )
                  from public.option_groups as option_group
                  where option_group.shop_id = shop.id
                    and option_group.product_id = product.id
                    and option_group.is_visible
                ), '[]'::jsonb)
              ) order by product.sort_order, product.name
            )
            from public.products as product
            where product.shop_id = shop.id
              and product.category_id = category.id
              and product.is_visible
          ), '[]'::jsonb)
        ) order by category.sort_order, category.name
      )
      from public.categories as category
      where category.shop_id = shop.id and category.is_visible
    ), '[]'::jsonb)
  )
  from public.shops as shop
  where shop.id = target_shop_id;
$$;

create or replace function public.consume_checkout_rate_limit(
  target_shop_id uuid,
  request_fingerprint text,
  maximum_attempts integer default 10,
  window_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_count integer;
begin
  if request_fingerprint !~ '^[0-9a-f]{64}$'
    or maximum_attempts not between 1 and 100
    or window_seconds not between 10 and 3600 then
    raise exception using errcode = '22023', message = 'Invalid rate-limit input.';
  end if;

  insert into public.checkout_rate_limits (
    shop_id, client_fingerprint, window_started_at, attempt_count
  ) values (target_shop_id, request_fingerprint, now(), 1)
  on conflict (shop_id, client_fingerprint) do update
  set window_started_at = case
        when public.checkout_rate_limits.window_started_at <= now() - make_interval(secs => window_seconds)
          then now()
        else public.checkout_rate_limits.window_started_at
      end,
      attempt_count = case
        when public.checkout_rate_limits.window_started_at <= now() - make_interval(secs => window_seconds)
          then 1
        else public.checkout_rate_limits.attempt_count + 1
      end
  returning attempt_count into saved_count;

  return saved_count <= maximum_attempts;
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
  option_row public.product_options;
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

  select * into existing_order
  from public.orders
  where shop_id = target_shop_id and idempotency_key = request_idempotency_key;

  if existing_order.id is not null then
    if existing_order.tracking_token_hash <> token_hash then
      raise exception using errcode = '23505', message = 'Idempotency key is already associated with another tracking token.';
    end if;
    return jsonb_build_object(
      'orderId', existing_order.id,
      'queueNumber', existing_order.queue_number,
      'orderReference', existing_order.order_reference,
      'trackingToken', request_tracking_token,
      'status', existing_order.status,
      'totalSatang', existing_order.total_satang
    );
  end if;

  select * into active_session
  from public.store_sessions
  where shop_id = target_shop_id and status = 'OPEN'
  for share;

  if active_session.id is null then
    raise exception using errcode = 'P0001', message = 'Shop is closed.';
  end if;

  select * into shop_location
  from public.shop_locations
  where shop_id = target_shop_id;

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
    customer_latitude,
    customer_longitude,
    shop_location.latitude::double precision,
    shop_location.longitude::double precision
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

    select * into product_row
    from public.products
    where id = (cart_item ->> 'productId')::uuid
      and shop_id = target_shop_id
      and is_visible and is_available;

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
      select count(*) into selected_count
      from public.product_options
      where id = any(selected_option_ids)
        and option_group_id = option_group_row.id
        and shop_id = target_shop_id
        and is_visible and is_available;

      if selected_count < option_group_row.min_select or selected_count > option_group_row.max_select then
        raise exception using errcode = '22023', message = 'Product option selection is invalid.';
      end if;
    end loop;

    if exists (
      select 1 from unnest(selected_option_ids) as selected_id
      where not exists (
        select 1 from public.product_options as selected_option
        join public.option_groups as selected_group on selected_group.id = selected_option.option_group_id
        where selected_option.id = selected_id
          and selected_option.shop_id = target_shop_id
          and selected_option.is_visible and selected_option.is_available
          and selected_group.product_id = product_row.id
          and selected_group.is_visible
      )
    ) then
      raise exception using errcode = '22023', message = 'A selected option is invalid or unavailable.';
    end if;

    select product_row.base_price_satang + coalesce(sum(price_delta_satang), 0)
    into unit_price
    from public.product_options
    where id = any(selected_option_ids);

    subtotal := subtotal + (unit_price * item_quantity);
  end loop;

  insert into public.queue_counters (shop_id, business_date, last_number)
  values (target_shop_id, active_session.business_date, 1)
  on conflict (shop_id, business_date) do update
  set last_number = public.queue_counters.last_number + 1,
      updated_at = now()
  returning last_number into queue_value;

  insert into public.orders (
    shop_id, store_session_id, business_date, queue_number, order_reference,
    source, status, payment_status, subtotal_satang, total_satang,
    customer_note, idempotency_key, tracking_token_hash,
    location_accuracy_m, location_distance_m
  ) values (
    target_shop_id, active_session.id, active_session.business_date, queue_value,
    'DP-' || to_char(active_session.business_date, 'YYYYMMDD') || '-' || lpad(queue_value::text, 3, '0'),
    'QR', 'QUEUED', 'UNPAID', subtotal, subtotal,
    btrim(order_note), request_idempotency_key, token_hash,
    customer_accuracy_m, location_distance
  ) returning * into new_order;

  for cart_item in select value from jsonb_array_elements(cart_items)
  loop
    select * into product_row from public.products where id = (cart_item ->> 'productId')::uuid;
    item_quantity := (cart_item ->> 'quantity')::integer;
    item_note := coalesce(cart_item ->> 'note', '');
    select coalesce(array_agg(distinct value::uuid), array[]::uuid[])
    into selected_option_ids
    from jsonb_array_elements_text(coalesce(cart_item -> 'optionIds', '[]'::jsonb));
    select product_row.base_price_satang + coalesce(sum(price_delta_satang), 0)
    into unit_price from public.product_options where id = any(selected_option_ids);

    insert into public.order_items (
      order_id, product_id, product_name, unit_price_satang, quantity, item_note, line_total_satang
    ) values (
      new_order.id, product_row.id, product_row.name, unit_price,
      item_quantity, item_note, unit_price * item_quantity
    ) returning id into new_item_id;

    for option_row in select * from public.product_options where id = any(selected_option_ids)
    loop
      insert into public.order_item_options (
        order_item_id, product_option_id, option_name, price_delta_satang
      ) values (new_item_id, option_row.id, option_row.name, option_row.price_delta_satang);
    end loop;
  end loop;

  insert into public.order_events (order_id, shop_id, from_status, to_status, metadata)
  values (new_order.id, target_shop_id, null, 'QUEUED', jsonb_build_object('source', 'QR'));

  return jsonb_build_object(
    'orderId', new_order.id,
    'queueNumber', new_order.queue_number,
    'orderReference', new_order.order_reference,
    'trackingToken', request_tracking_token,
    'status', new_order.status,
    'totalSatang', new_order.total_satang
  );
end;
$$;

create or replace function public.track_order(request_tracking_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'orderId', order_row.id,
    'shopName', shop.name,
    'queueNumber', order_row.queue_number,
    'orderReference', order_row.order_reference,
    'status', order_row.status,
    'totalSatang', order_row.total_satang,
    'createdAt', order_row.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', item.product_name,
        'quantity', item.quantity,
        'lineTotalSatang', item.line_total_satang,
        'options', coalesce((
          select jsonb_agg(option_item.option_name order by option_item.created_at)
          from public.order_item_options as option_item
          where option_item.order_item_id = item.id
        ), '[]'::jsonb)
      ) order by item.created_at)
      from public.order_items as item where item.order_id = order_row.id
    ), '[]'::jsonb)
  )
  from public.orders as order_row
  join public.shops as shop on shop.id = order_row.shop_id
  where order_row.tracking_token_hash = encode(
    extensions.digest(request_tracking_token::text, 'sha256'), 'hex'
  );
$$;

revoke execute on function app_private.distance_meters(double precision, double precision, double precision, double precision)
  from public, anon, authenticated;
revoke execute on function public.consume_checkout_rate_limit(uuid, text, integer, integer)
  from public, anon, authenticated;
revoke execute on function public.get_public_menu(uuid) from public;
revoke execute on function public.create_qr_order(uuid, uuid, uuid, double precision, double precision, double precision, timestamptz, jsonb, text) from public, anon, authenticated;
revoke execute on function public.track_order(uuid) from public;

grant execute on function public.get_public_menu(uuid) to anon, authenticated;
grant execute on function public.consume_checkout_rate_limit(uuid, text, integer, integer) to service_role;
grant execute on function public.create_qr_order(uuid, uuid, uuid, double precision, double precision, double precision, timestamptz, jsonb, text) to service_role;
grant execute on function public.track_order(uuid) to anon, authenticated;

commit;
