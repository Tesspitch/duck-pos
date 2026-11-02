begin;

-- Keep the historical ledger and all restrictive foreign keys intact.
alter table public.shops add column deleted_at timestamptz;
alter table public.shops add column deleted_by uuid references public.platform_admins(user_id) on delete restrict;
alter table public.shops add constraint shops_deletion_consistent check ((deleted_at is null) = (deleted_by is null));
create index shops_active_created_idx on public.shops(created_at desc, id) where deleted_at is null;

create or replace function app_private.is_active_shop_member(
  target_shop_id uuid, allowed_roles public.shop_role[] default null
) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.shop_members m join public.shops s on s.id=m.shop_id
    where m.shop_id=target_shop_id and m.user_id=(select auth.uid())
      and m.status='ACTIVE' and s.deleted_at is null
      and (allowed_roles is null or m.role=any(allowed_roles))
  );
$$;

-- Share-lock the shop so a new checkout/session cannot race with archival.
create function app_private.require_live_shop() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.shops where id=new.shop_id and deleted_at is null for share;
  if not found then raise exception using errcode='P0001', message='Shop is unavailable.'; end if;
  return new;
end;
$$;
revoke all on function app_private.require_live_shop() from public, anon, authenticated;
create trigger orders_require_live_shop before insert on public.orders
for each row execute function app_private.require_live_shop();
create trigger sessions_require_live_shop before insert on public.store_sessions
for each row execute function app_private.require_live_shop();

create function public.list_platform_shops(search_text text default '', page_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not app_private.is_platform_admin() then
    raise exception using errcode='42501', message='Platform administrator access required.';
  end if;
  if page_offset is null or page_offset < 0 or char_length(coalesce(search_text,'')) > 120 then
    raise exception using errcode='22023', message='Invalid shop search.';
  end if;
  with matches as (
    select id,name,created_at from public.shops
    where deleted_at is null and (coalesce(search_text,'')='' or strpos(lower(name),lower(search_text))>0 or id::text=search_text)
    order by created_at desc,id offset page_offset limit 21
  ), page as (select * from matches order by created_at desc,id limit 20)
  select jsonb_build_object('shops',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by created_at desc,id) from page),'[]'::jsonb),
    'hasMore',(select count(*)>20 from matches)) into result;
  return result;
end;
$$;

create function public.delete_platform_shop(target_shop_id uuid, confirmation_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.shops;
begin
  if not app_private.is_platform_admin() then
    raise exception using errcode='42501', message='Platform administrator access required.';
  end if;
  select * into target from public.shops where id=target_shop_id for update;
  if target.id is null or confirmation_name is distinct from target.name then
    raise exception using errcode='22023', message='Shop name confirmation does not match.';
  end if;
  if target.deleted_at is not null then return; end if;
  if exists(select 1 from public.store_sessions where shop_id=target.id and status='OPEN') then
    raise exception using errcode='P0001', message='Close the store session before deleting this shop.';
  end if;
  if exists(select 1 from public.orders where shop_id=target.id and
      (status in ('QUEUED','PREPARING','READY') or (status='COMPLETED' and payment_status='UNPAID'))) then
    raise exception using errcode='P0001', message='Resolve pending orders and payments before deleting this shop.';
  end if;
  update public.shops set deleted_at=now(),deleted_by=auth.uid() where id=target.id;
  insert into public.audit_logs(shop_id,actor_user_id,action,entity_type,entity_id,metadata)
    values(target.id,auth.uid(),'SHOP_DELETED','shop',target.id,jsonb_build_object('name',target.name,'mode','archive'));
end;
$$;
revoke all on function public.list_platform_shops(text,integer), public.delete_platform_shop(uuid,text) from public,anon;
grant execute on function public.list_platform_shops(text,integer), public.delete_platform_shop(uuid,text) to authenticated;

-- The tracking token is a capability. Never accept an order ID or a client status.
create function public.cancel_customer_order(request_tracking_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare target public.orders;
begin
  select * into target from public.orders where tracking_token_hash=encode(
    extensions.digest(request_tracking_token::text,'sha256'),'hex') for update;
  if target.id is null or target.source <> 'QR' then
    raise exception using errcode='P0002', message='Order not found.';
  end if;
  -- Idempotent retries cannot create duplicate cancellation events.
  if target.status='CANCELLED' then
    return jsonb_build_object('orderId',target.id,'status','CANCELLED');
  end if;
  if target.status <> 'QUEUED' then
    raise exception using errcode='P0001', message='Preparation has started. Please contact the shop.';
  end if;
  if target.payment_status <> 'UNPAID' then
    raise exception using errcode='P0001', message='Please contact the shop to cancel a paid order.';
  end if;
  update public.orders set status='CANCELLED' where id=target.id;
  insert into public.order_events(order_id,shop_id,from_status,to_status,metadata)
    values(target.id,target.shop_id,'QUEUED','CANCELLED',jsonb_build_object('source','CUSTOMER','reason','Cancelled before preparation'));
  insert into public.audit_logs(shop_id,action,entity_type,entity_id,metadata)
    values(target.shop_id,'CUSTOMER_ORDER_CANCELLED','order',target.id,'{}'::jsonb);
  return jsonb_build_object('orderId',target.id,'status','CANCELLED');
end;
$$;
revoke all on function public.cancel_customer_order(uuid) from public;
grant execute on function public.cancel_customer_order(uuid) to anon,authenticated;

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
  from public.shops as shop where shop.id = target_shop_id and shop.deleted_at is null;
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
    'shopId', order_row.shop_id,
    'shopName', shop.name,
    'queueNumber', order_row.queue_number,
    'orderReference', order_row.order_reference,
    'status', order_row.status,
    'paymentStatus', order_row.payment_status,
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



commit;
