begin;
-- A table epoch identifies the current seating opportunity, even before a bill exists.
alter table public.dining_tables add column ordering_epoch uuid not null default extensions.gen_random_uuid();
alter table public.table_sessions alter column opened_by drop not null;

-- Consistent lock order for auto checkout, payment and closing: shop -> table -> bill.
create or replace function app_private.lock_table_bill(target_bill_id uuid)
returns public.table_bills language plpgsql security definer set search_path='' as $$
declare b public.table_bills; tid uuid;
begin
 select * into b from public.table_bills where id=target_bill_id;
 if b.id is null then raise exception 'Table bill not found.'; end if;
 perform 1 from public.shops where id=b.shop_id and deleted_at is null for share;
 if not found then raise exception 'Shop is unavailable.'; end if;
 select table_id into tid from public.table_sessions where id=b.table_session_id;
 perform 1 from public.dining_tables where id=tid for update;
 select * into b from public.table_bills where id=target_bill_id for update;
 return b;
end $$;

create function app_private.advance_table_epoch() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.closed_at is null and new.closed_at is not null then
  update public.dining_tables set ordering_epoch=extensions.gen_random_uuid() where id=new.table_id;
 end if;
 return new;
end $$;
revoke all on function app_private.advance_table_epoch() from public,anon,authenticated;
create trigger table_round_advance after update of closed_at on public.table_sessions for each row execute function app_private.advance_table_epoch();

create or replace function public.get_dining_table_context(table_qr_token uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('tableId',t.id,'tableName',t.name,'shopId',t.shop_id,'shopName',shop.name,
 'tableEpoch',t.ordering_epoch,'billId',b.id,'billStatus',b.status,
 'acceptingOrders',coalesce(ss.status='OPEN' and ss.accepting_orders and (b.id is null or b.status='OPEN'),false))
 from public.dining_tables t join public.shops shop on shop.id=t.shop_id and shop.deleted_at is null
 left join public.table_sessions s on s.table_id=t.id and s.closed_at is null
 left join public.table_bills b on b.table_session_id=s.id
 left join public.store_sessions ss on ss.shop_id=t.shop_id and ss.status='OPEN'
 where t.qr_token=table_qr_token and t.is_active;
$$;

create function public.create_auto_table_qr_order(
 target_shop_id uuid,table_qr_token uuid,expected_table_epoch uuid,guest_token uuid,
 request_idempotency_key uuid,request_tracking_token uuid,
 customer_latitude double precision,customer_longitude double precision,customer_accuracy_m double precision,
 location_captured_at timestamptz,cart_items jsonb,order_note text default ''
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.dining_tables; ss public.store_sessions; ts uuid; bill uuid; existing public.orders; result jsonb; h text;
begin
 if guest_token is null or request_tracking_token is null or request_idempotency_key is null or expected_table_epoch is null then raise exception 'Invalid tracking identity.'; end if;
 h:=encode(extensions.digest(guest_token::text,'sha256'),'hex');
 perform 1 from public.shops where id=target_shop_id and deleted_at is null for share;
 if not found then raise exception 'Shop is unavailable.'; end if;
 select * into t from public.dining_tables where qr_token=table_qr_token and shop_id=target_shop_id and is_active for update;
 if t.id is null then raise exception 'Table not found.'; end if;
 -- A response-lost retry must still resolve the original bill after payment/epoch rotation.
 select * into existing from public.orders where shop_id=target_shop_id and idempotency_key=request_idempotency_key;
 if existing.id is not null then
  if existing.table_guest_hash is distinct from h or existing.tracking_token_hash is distinct from encode(extensions.digest(request_tracking_token::text,'sha256'),'hex')
   or not exists(select 1 from public.table_bills b join public.table_sessions s on s.id=b.table_session_id where b.id=existing.table_bill_id and s.table_id=t.id) then raise exception 'Checkout identity mismatch.'; end if;
  return jsonb_build_object('orderId',existing.id,'queueNumber',existing.queue_number,'orderReference',existing.order_reference,'trackingToken',request_tracking_token,'status',existing.status,'totalSatang',existing.total_satang,'tableBillId',existing.table_bill_id);
 end if;
 if expected_table_epoch is distinct from t.ordering_epoch then raise exception using errcode='40001',message='Table round changed. Scan again before ordering.'; end if;
 select * into ss from public.store_sessions where shop_id=target_shop_id and status='OPEN' and accepting_orders for share;
 if ss.id is null then raise exception 'Shop is not accepting orders.'; end if;
 select b.id into bill from public.table_sessions s join public.table_bills b on b.table_session_id=s.id where s.table_id=t.id and s.closed_at is null;
 if bill is null then
  insert into public.table_sessions(shop_id,table_id,table_name,store_session_id,opened_by) values(t.shop_id,t.id,t.name,ss.id,null) returning id into ts;
  insert into public.table_bills(shop_id,table_session_id) values(t.shop_id,ts) returning id into bill;
  insert into public.audit_logs(shop_id,action,entity_type,entity_id,metadata) values(t.shop_id,'DINING_TABLE_AUTO_OPENED','table_bill',bill,jsonb_build_object('source','CUSTOMER_QR'));
 end if;
 result:=public.create_table_qr_order(target_shop_id,table_qr_token,bill,guest_token,request_idempotency_key,request_tracking_token,customer_latitude,customer_longitude,customer_accuracy_m,location_captured_at,cart_items,order_note);
 return result||jsonb_build_object('tableBillId',bill);
 -- Any geofence, pricing or validation error rolls back the new round and audit too.
end $$;
revoke all on function public.create_auto_table_qr_order(uuid,uuid,uuid,uuid,uuid,uuid,double precision,double precision,double precision,timestamptz,jsonb,text) from public,anon,authenticated;
grant execute on function public.create_auto_table_qr_order(uuid,uuid,uuid,uuid,uuid,uuid,double precision,double precision,double precision,timestamptz,jsonb,text) to service_role;

-- Once the last dish is completed, a settled table becomes available automatically.
create or replace function public.update_order_status(target_order_id uuid,expected_status public.order_status,next_status public.order_status,cancellation_reason text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders; b public.table_bills; result jsonb;
begin
 select * into o from public.orders where id=target_order_id;
 if o.table_bill_id is not null then
  if not app_private.is_active_shop_member(o.shop_id) then raise exception using errcode='42501',message='Active shop membership is required.'; end if;
  b:=app_private.lock_table_bill(o.table_bill_id);
  if next_status='CANCELLED' and b.status<>'OPEN' then raise exception 'Reopen the bill before cancellation.'; end if;
 end if;
 result:=public.update_order_status_before_dining(target_order_id,expected_status,next_status,cancellation_reason);
 if b.status='PAID' and not exists(select 1 from public.orders where table_bill_id=b.id and status in('QUEUED','PREPARING','READY'))
  and exists(select 1 from public.table_sessions where id=b.table_session_id and closed_at is null) then perform public.close_dining_table(b.id); end if;
 return result;
end $$;
commit;
