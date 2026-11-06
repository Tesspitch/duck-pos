begin;
-- Shared pricing and queue logic. Only the validated table path may omit GPS.
create or replace function app_private.create_customer_order(
  target_shop_id uuid,
  request_idempotency_key uuid,
  request_tracking_token uuid,
  customer_latitude double precision,
  customer_longitude double precision,
  customer_accuracy_m double precision,
  location_captured_at timestamptz,
  cart_items jsonb,
  order_note text default '',
  enforce_geofence boolean default true
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
  if enforce_geofence is not false then
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
  
  
  else
    customer_accuracy_m := null;
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


revoke all on function app_private.create_customer_order(uuid,uuid,uuid,double precision,double precision,double precision,timestamptz,jsonb,text,boolean) from public,anon,authenticated,service_role;

create or replace function public.create_qr_order(
 target_shop_id uuid, request_idempotency_key uuid, request_tracking_token uuid,
 customer_latitude double precision, customer_longitude double precision, customer_accuracy_m double precision,
 location_captured_at timestamptz, cart_items jsonb, order_note text default ''
) returns jsonb language sql security definer set search_path='' as $$
 select app_private.create_customer_order(target_shop_id,request_idempotency_key,request_tracking_token,
 customer_latitude,customer_longitude,customer_accuracy_m,location_captured_at,cart_items,order_note,true);
$$;

create or replace function public.create_table_qr_order(
 target_shop_id uuid,table_qr_token uuid,expected_bill_id uuid,guest_token uuid,
 request_idempotency_key uuid,request_tracking_token uuid,
 customer_latitude double precision,customer_longitude double precision,customer_accuracy_m double precision,
 location_captured_at timestamptz,cart_items jsonb,order_note text default ''
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.table_bills; t public.dining_tables; result jsonb; existing public.orders; h text;
begin
 if guest_token is null or request_tracking_token is null then raise exception 'Invalid tracking identity.'; end if;
 h:=encode(extensions.digest(guest_token::text,'sha256'),'hex');
 select * into t from public.dining_tables where qr_token=table_qr_token and shop_id=target_shop_id and is_active;
 if t.id is null then raise exception 'Table not found.'; end if;
 b:=app_private.lock_table_bill(expected_bill_id);
 if b.shop_id<>target_shop_id or not exists(select 1 from public.table_sessions where id=b.table_session_id and table_id=t.id) then raise exception 'Table session mismatch.'; end if;
 select * into existing from public.orders where shop_id=target_shop_id and idempotency_key=request_idempotency_key;
 if existing.id is not null then
  if existing.table_bill_id is distinct from b.id or existing.table_guest_hash is distinct from h or existing.tracking_token_hash<>encode(extensions.digest(request_tracking_token::text,'sha256'),'hex') then raise exception 'Checkout identity mismatch.'; end if;
  return jsonb_build_object('orderId',existing.id,'queueNumber',existing.queue_number,'orderReference',existing.order_reference,'trackingToken',request_tracking_token,'status',existing.status,'totalSatang',existing.total_satang);
 end if;
 if b.status<>'OPEN' or exists(select 1 from public.table_sessions where id=b.table_session_id and closed_at is not null) then raise exception 'Table is not accepting orders.'; end if;
 insert into app_private.table_guests(token_hash,bill_id) values(h,b.id) on conflict do nothing;
 if not exists(select 1 from app_private.table_guests where token_hash=h and bill_id=b.id) then raise exception 'Guest token belongs to another round.'; end if;
 result:=app_private.create_customer_order(target_shop_id,request_idempotency_key,request_tracking_token,null,null,null,null,cart_items,order_note,false);
 update public.orders set table_bill_id=b.id,table_name=t.name,table_guest_hash=h where id=(result->>'orderId')::uuid;
 return result;
end $$;
revoke all on function public.create_table_qr_order(uuid,uuid,uuid,uuid,uuid,uuid,double precision,double precision,double precision,timestamptz,jsonb,text) from public,anon,authenticated;
grant execute on function public.create_table_qr_order(uuid,uuid,uuid,uuid,uuid,uuid,double precision,double precision,double precision,timestamptz,jsonb,text) to service_role;


commit;

