begin;
create table public.dining_tables(
 id uuid primary key default extensions.gen_random_uuid(),shop_id uuid not null references public.shops(id),
 name text not null check(char_length(btrim(name)) between 1 and 60),
 qr_token uuid not null default extensions.gen_random_uuid() unique,
 is_active boolean not null default true,created_at timestamptz not null default now(),
 unique(shop_id,id),unique(shop_id,name)
);
create table public.table_sessions(
 id uuid primary key default extensions.gen_random_uuid(),shop_id uuid not null references public.shops(id),
 table_id uuid not null,table_name text not null,store_session_id uuid not null,
 opened_at timestamptz not null default now(),opened_by uuid not null references public.user_profiles(id),
 closed_at timestamptz,closed_by uuid references public.user_profiles(id),
 unique(shop_id,id),foreign key(shop_id,table_id) references public.dining_tables(shop_id,id),
 foreign key(shop_id,store_session_id) references public.store_sessions(shop_id,id)
);
create unique index table_sessions_one_active on public.table_sessions(table_id) where closed_at is null;
create index table_sessions_shop_active on public.table_sessions(shop_id,store_session_id) where closed_at is null;
create table public.table_bills(
 id uuid primary key default extensions.gen_random_uuid(),shop_id uuid not null references public.shops(id),
 table_session_id uuid not null unique,status text not null default 'OPEN' check(status in('OPEN','CHECKOUT','PAID','VOID')),
 paid_total_satang integer,paid_at timestamptz,
 unique(shop_id,id),foreign key(shop_id,table_session_id) references public.table_sessions(shop_id,id),
 check((status='PAID')=(paid_at is not null)),check(paid_total_satang is null or paid_total_satang>=0)
);
create table public.table_bill_payments(
 id uuid primary key default extensions.gen_random_uuid(),bill_id uuid not null unique references public.table_bills(id),
 shop_id uuid not null references public.shops(id),request_id uuid not null unique,
 method public.payment_method not null,total_satang integer not null check(total_satang>=0),
 received_satang integer not null check(received_satang>=total_satang),change_satang integer not null check(change_satang=received_satang-total_satang),
 paid_at timestamptz not null default now(),paid_by uuid not null references public.user_profiles(id)
);
create table app_private.table_guests(
 token_hash text primary key,bill_id uuid not null references public.table_bills(id),created_at timestamptz not null default now()
);
revoke all on app_private.table_guests from public,anon,authenticated;
alter table app_private.table_guests enable row level security;
alter table public.orders add column table_bill_id uuid,add column table_name text,add column table_guest_hash text;
alter table public.orders add foreign key(shop_id,table_bill_id) references public.table_bills(shop_id,id);
create index orders_table_bill_idx on public.orders(table_bill_id,created_at) where table_bill_id is not null;
create index orders_table_guest_idx on public.orders(table_guest_hash,created_at) where table_guest_hash is not null;
do $$ declare t text; begin
 foreach t in array array['dining_tables','table_sessions','table_bills','table_bill_payments'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy member_read on public.%I for select to authenticated using(app_private.is_active_shop_member(shop_id))',t);
 end loop;
end $$;

create function app_private.lock_table_bill(target_bill_id uuid)
returns public.table_bills language plpgsql security definer set search_path='' as $$
declare b public.table_bills;
begin
 select * into b from public.table_bills where id=target_bill_id;
 if b.id is null then raise exception 'Table bill not found.'; end if;
 perform 1 from public.shops where id=b.shop_id and deleted_at is null for share;
 if not found then raise exception 'Shop is unavailable.'; end if;
 select * into b from public.table_bills where id=target_bill_id for update;
 return b;
end $$;
revoke all on function app_private.lock_table_bill(uuid) from public,anon,authenticated;

create function public.save_dining_table(target_shop_id uuid,table_name text)
returns uuid language plpgsql security definer set search_path='' as $$
declare saved uuid;
begin
 if not app_private.is_active_shop_member(target_shop_id,array['OWNER']::public.shop_role[]) then raise exception using errcode='42501',message='Owner access required.'; end if;
 if (select count(*) from public.dining_tables where shop_id=target_shop_id)>=200 then raise exception 'Maximum 200 tables per shop.'; end if;
 insert into public.dining_tables(shop_id,name) values(target_shop_id,btrim(table_name)) returning id into saved;
 insert into public.audit_logs(shop_id,actor_user_id,action,entity_type,entity_id) values(target_shop_id,auth.uid(),'DINING_TABLE_CREATED','dining_table',saved);
 return saved;
end $$;

create function public.open_dining_table(target_table_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare t public.dining_tables; ss uuid; ts uuid; bill uuid;
begin
 select * into t from public.dining_tables where id=target_table_id;
 if t.id is null or not app_private.is_active_shop_member(t.shop_id) then raise exception using errcode='42501',message='Active shop membership is required.'; end if;
 perform 1 from public.shops where id=t.shop_id and deleted_at is null for share;
 select * into t from public.dining_tables where id=target_table_id for update;
 if not t.is_active then raise exception 'Table is disabled.'; end if;
 select id into ss from public.store_sessions where shop_id=t.shop_id and status='OPEN' and accepting_orders for share;
 if ss is null then raise exception 'Shop is not accepting orders.'; end if;
 insert into public.table_sessions(shop_id,table_id,table_name,store_session_id,opened_by) values(t.shop_id,t.id,t.name,ss,auth.uid()) returning id into ts;
 insert into public.table_bills(shop_id,table_session_id) values(t.shop_id,ts) returning id into bill;
 insert into public.audit_logs(shop_id,actor_user_id,action,entity_type,entity_id) values(t.shop_id,auth.uid(),'DINING_TABLE_OPENED','table_bill',bill);
 return bill;
end $$;

create function public.list_dining_tables(target_shop_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not app_private.is_active_shop_member(target_shop_id) then raise exception using errcode='42501',message='Active shop membership is required.'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'qrToken',t.qr_token,'billId',b.id,'status',coalesce(b.status,'AVAILABLE'),
 'openedAt',s.opened_at,'totalSatang',coalesce(b.paid_total_satang,(select sum(total_satang) from public.orders where table_bill_id=b.id and status<>'CANCELLED'),0))
 order by t.created_at,t.id) from public.dining_tables t left join public.table_sessions s on s.table_id=t.id and s.closed_at is null
 left join public.table_bills b on b.table_session_id=s.id where t.shop_id=target_shop_id and t.is_active),'[]'::jsonb);
end $$;

create function public.get_dining_table_context(table_qr_token uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('tableId',t.id,'tableName',t.name,'shopId',t.shop_id,'shopName',shop.name,
 'billId',b.id,'billStatus',b.status,'acceptingOrders',coalesce(ss.status='OPEN' and ss.accepting_orders and b.status='OPEN',false))
 from public.dining_tables t join public.shops shop on shop.id=t.shop_id and shop.deleted_at is null
 left join public.table_sessions s on s.table_id=t.id and s.closed_at is null
 left join public.table_bills b on b.table_session_id=s.id
 left join public.store_sessions ss on ss.id=s.store_session_id
 where t.qr_token=table_qr_token and t.is_active;
$$;

create function public.get_table_bill(target_bill_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare b public.table_bills; result jsonb;
begin
 select * into b from public.table_bills where id=target_bill_id;
 if b.id is null or not app_private.is_active_shop_member(b.shop_id) then raise exception using errcode='42501',message='Active shop membership is required.'; end if;
 select jsonb_build_object('id',b.id,'shopId',b.shop_id,'tableName',s.table_name,'sessionId',s.id,'status',b.status,'closed',s.closed_at is not null,
 'totalSatang',coalesce(b.paid_total_satang,(select sum(total_satang) from public.orders where table_bill_id=b.id and status<>'CANCELLED'),0),
 'fingerprint',encode(extensions.digest(b.id::text||b.status||coalesce((select string_agg(id::text||total_satang::text||payment_status::text,',' order by id) from public.orders where table_bill_id=b.id and status<>'CANCELLED'),''),'sha256'),'hex'),
 'pendingCount',(select count(*) from public.orders where table_bill_id=b.id and status in('QUEUED','PREPARING','READY')),
 'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'reference',o.order_reference,'queueNumber',o.queue_number,'status',o.status,'totalSatang',o.total_satang,
 'items',coalesce((select jsonb_agg(jsonb_build_object('name',i.product_name,'quantity',i.quantity,'note',i.item_note,
 'options',coalesce((select jsonb_agg(option_name) from public.order_item_options where order_item_id=i.id),'[]'::jsonb))) from public.order_items i where i.order_id=o.id),'[]'::jsonb))
 order by o.created_at) from public.orders o where o.table_bill_id=b.id),'[]'::jsonb),
 'payment',(select jsonb_build_object('method',method,'receivedSatang',received_satang,'changeSatang',change_satang,'paidAt',paid_at) from public.table_bill_payments where bill_id=b.id))
 into result from public.table_sessions s where s.id=b.table_session_id;
 return result;
end $$;

create function public.set_table_bill_checkout(target_bill_id uuid,checking_out boolean)
returns void language plpgsql security definer set search_path='' as $$
declare b public.table_bills;
begin
 select * into b from public.table_bills where id=target_bill_id;
 if not app_private.is_active_shop_member(b.shop_id) then raise exception using errcode='42501',message='Active shop membership is required.'; end if;
 b:=app_private.lock_table_bill(target_bill_id);
 if b.status not in('OPEN','CHECKOUT') then raise exception 'Bill is already settled.'; end if;
 update public.table_bills set status=case when checking_out then 'CHECKOUT' else 'OPEN' end where id=b.id;
 insert into public.audit_logs(shop_id,actor_user_id,action,entity_type,entity_id) values(b.shop_id,auth.uid(),case when checking_out then 'TABLE_CHECKOUT_STARTED' else 'TABLE_CHECKOUT_REOPENED' end,'table_bill',b.id);
end $$;

-- Keep the existing pricing, availability, geofence and queue implementation.
create function public.create_table_qr_order(
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
 result:=public.create_qr_order(target_shop_id,request_idempotency_key,request_tracking_token,customer_latitude,customer_longitude,customer_accuracy_m,location_captured_at,cart_items,order_note);
 update public.orders set table_bill_id=b.id,table_name=t.name,table_guest_hash=h where id=(result->>'orderId')::uuid;
 return result;
end $$;
revoke all on function public.create_table_qr_order(uuid,uuid,uuid,uuid,uuid,uuid,double precision,double precision,double precision,timestamptz,jsonb,text) from public,anon,authenticated;
grant execute on function public.create_table_qr_order(uuid,uuid,uuid,uuid,uuid,uuid,double precision,double precision,double precision,timestamptz,jsonb,text) to service_role;

create function public.create_table_pos_order(target_shop_id uuid,target_bill_id uuid,request_idempotency_key uuid,cart_items jsonb,order_note text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.table_bills; result jsonb; existing public.orders; name text;
begin
 if not app_private.is_active_shop_member(target_shop_id) then raise exception using errcode='42501',message='Active shop membership is required.'; end if;
 b:=app_private.lock_table_bill(target_bill_id);
 if b.shop_id<>target_shop_id then raise exception 'Table session mismatch.'; end if;
 select * into existing from public.orders where shop_id=target_shop_id and idempotency_key=request_idempotency_key;
 if existing.id is not null then
  if existing.table_bill_id is distinct from b.id then raise exception 'Checkout identity mismatch.'; end if;
  return jsonb_build_object('orderId',existing.id,'queueNumber',existing.queue_number,'orderReference',existing.order_reference,'status',existing.status,'totalSatang',existing.total_satang);
 end if;
 if b.status<>'OPEN' then raise exception 'Table is not accepting orders.'; end if;
 select table_name into name from public.table_sessions where id=b.table_session_id and closed_at is null;
 if name is null then raise exception 'Table session ended.'; end if;
 result:=public.create_pos_order(target_shop_id,request_idempotency_key,cart_items,order_note);
 update public.orders set table_bill_id=b.id,table_name=name where id=(result->>'orderId')::uuid;
 return result;
end $$;

-- Token scoped: only orders created by this browser guest, never other diners.
create function public.track_table_round(guest_token uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('billId',b.id,'shopId',b.shop_id,'shopName',shop.name,'tableName',s.table_name,'tableQrToken',t.qr_token,
 'status',b.status,'closed',s.closed_at is not null,'acceptingOrders',b.status='OPEN' and s.closed_at is null and ss.status='OPEN' and ss.accepting_orders,
 'ownTotalSatang',coalesce((select sum(total_satang) from public.orders where table_bill_id=b.id and table_guest_hash=g.token_hash and status<>'CANCELLED'),0),
 'orders',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'reference',o.order_reference,'queueNumber',o.queue_number,'status',o.status,'totalSatang',o.total_satang,
 'items',coalesce((select jsonb_agg(jsonb_build_object('name',product_name,'quantity',quantity,'options',coalesce((select jsonb_agg(option_name) from public.order_item_options where order_item_id=i.id),'[]'::jsonb))) from public.order_items i where i.order_id=o.id),'[]'::jsonb)) order by o.created_at)
 from public.orders o where o.table_bill_id=b.id and o.table_guest_hash=g.token_hash),'[]'::jsonb))
 from app_private.table_guests g join public.table_bills b on b.id=g.bill_id join public.table_sessions s on s.id=b.table_session_id
 join public.dining_tables t on t.id=s.table_id join public.shops shop on shop.id=b.shop_id
 join public.store_sessions ss on ss.id=s.store_session_id
 where g.token_hash=encode(extensions.digest(guest_token::text,'sha256'),'hex');
$$;

-- Serialize cancellation against bill freeze/payment before locking the order.
alter function public.update_order_status(uuid,public.order_status,public.order_status,text) rename to update_order_status_before_dining;
revoke all on function public.update_order_status_before_dining(uuid,public.order_status,public.order_status,text) from public,anon,authenticated;
create function public.update_order_status(target_order_id uuid,expected_status public.order_status,next_status public.order_status,cancellation_reason text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders; b public.table_bills;
begin
 select * into o from public.orders where id=target_order_id;
 if o.table_bill_id is not null then
  if not app_private.is_active_shop_member(o.shop_id) then raise exception using errcode='42501',message='Active shop membership is required.'; end if;
  b:=app_private.lock_table_bill(o.table_bill_id);
  if next_status='CANCELLED' and b.status<>'OPEN' then raise exception 'Reopen the bill before cancellation.'; end if;
 end if;
 return public.update_order_status_before_dining(target_order_id,expected_status,next_status,cancellation_reason);
end $$;
alter function public.cancel_customer_order(uuid) rename to cancel_customer_order_before_dining;
revoke all on function public.cancel_customer_order_before_dining(uuid) from public,anon,authenticated;
create function public.cancel_customer_order(request_tracking_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare bill uuid; b public.table_bills;
begin
 select table_bill_id into bill from public.orders where tracking_token_hash=encode(extensions.digest(request_tracking_token::text,'sha256'),'hex');
 if bill is not null then b:=app_private.lock_table_bill(bill); if b.status<>'OPEN' then raise exception 'Reopen the bill before cancellation.'; end if; end if;
 return public.cancel_customer_order_before_dining(request_tracking_token);
end $$;
alter function public.record_order_payment(uuid,public.payment_method,integer) rename to record_order_payment_before_dining;
revoke all on function public.record_order_payment_before_dining(uuid,public.payment_method,integer) from public,anon,authenticated;
create function public.record_order_payment(target_order_id uuid,selected_method public.payment_method,amount_received_satang integer)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.orders where id=target_order_id and table_bill_id is not null) then raise exception 'Collect payment from the table bill.'; end if;
 return public.record_order_payment_before_dining(target_order_id,selected_method,amount_received_satang);
end $$;

create function public.close_dining_table(target_bill_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare b public.table_bills;
begin
 select * into b from public.table_bills where id=target_bill_id;
 if not app_private.is_active_shop_member(b.shop_id) then raise exception using errcode='42501',message='Active shop membership is required.'; end if;
 b:=app_private.lock_table_bill(target_bill_id);
 if exists(select 1 from public.orders where table_bill_id=b.id and status in('QUEUED','PREPARING','READY')) then raise exception 'Finish pending food before closing the table.'; end if;
 if b.status<>'PAID' and exists(select 1 from public.orders where table_bill_id=b.id and status<>'CANCELLED') then raise exception 'Pay the table bill before closing.'; end if;
 if b.status<>'PAID' then update public.table_bills set status='VOID' where id=b.id; end if;
 update public.table_sessions set closed_at=now(),closed_by=auth.uid() where id=b.table_session_id and closed_at is null;
 insert into public.audit_logs(shop_id,actor_user_id,action,entity_type,entity_id) values(b.shop_id,auth.uid(),'DINING_TABLE_CLOSED','table_bill',b.id);
end $$;

create function public.pay_table_bill(target_bill_id uuid,selected_method public.payment_method,received_satang integer,request_id uuid,expected_fingerprint text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.table_bills; total bigint; o public.orders; change_value integer; allocation integer; detail jsonb; p public.table_bill_payments;
begin
 select * into b from public.table_bills where id=target_bill_id;
 if not app_private.is_active_shop_member(b.shop_id) then raise exception using errcode='42501',message='Active shop membership is required.'; end if;
 b:=app_private.lock_table_bill(target_bill_id);
 select * into p from public.table_bill_payments where bill_id=b.id;
 if p.id is not null then
  if p.request_id is distinct from request_id or p.method is distinct from selected_method or p.received_satang is distinct from received_satang then raise exception 'Bill is already paid.'; end if;
  return jsonb_build_object('totalSatang',p.total_satang,'changeSatang',p.change_satang);
 end if;
 if b.status<>'CHECKOUT' then raise exception 'Start checkout before payment.'; end if;
 perform 1 from public.orders where table_bill_id=b.id order by id for update;
 detail:=public.get_table_bill(b.id);
 if expected_fingerprint is distinct from detail->>'fingerprint' then raise exception using errcode='40001',message='Bill changed. Review before payment.'; end if;
 total:=(detail->>'totalSatang')::bigint;
 if total>2147483647 or received_satang is null or received_satang<total or selected_method is null or request_id is null then raise exception 'Invalid received amount.'; end if;
 if selected_method='BANK_TRANSFER' and received_satang<>total then raise exception 'Bank transfer amount must equal bill total.'; end if;
 change_value:=received_satang-total;
 allocation:=change_value;
 for o in select * from public.orders where table_bill_id=b.id and status<>'CANCELLED' order by id loop
  perform public.record_order_payment_before_dining(o.id,selected_method,o.total_satang+allocation);
  allocation:=0;
 end loop;
 insert into public.table_bill_payments(bill_id,shop_id,request_id,method,total_satang,received_satang,change_satang,paid_by)
 values(b.id,b.shop_id,request_id,selected_method,total,received_satang,change_value,auth.uid());
 update public.table_bills set status='PAID',paid_total_satang=total,paid_at=now() where id=b.id;
 if not exists(select 1 from public.orders where table_bill_id=b.id and status in('QUEUED','PREPARING','READY')) then perform public.close_dining_table(b.id); end if;
 insert into public.audit_logs(shop_id,actor_user_id,action,entity_type,entity_id) values(b.shop_id,auth.uid(),'TABLE_BILL_PAID','table_bill',b.id);
 return jsonb_build_object('totalSatang',total,'changeSatang',change_value);
end $$;

-- Append table identity to the existing queue without adding duplicate channels.
alter function public.list_active_staff_orders(uuid) rename to list_active_staff_orders_before_dining;
revoke all on function public.list_active_staff_orders_before_dining(uuid) from public,anon,authenticated;
create function public.list_active_staff_orders(target_shop_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare payload jsonb;
begin
 payload:=public.list_active_staff_orders_before_dining(target_shop_id);
 return jsonb_set(payload,'{orders}',coalesce((select jsonb_agg(row.value||jsonb_build_object('tableBillId',o.table_bill_id,'tableName',o.table_name) order by row.ordinality)
 from jsonb_array_elements(payload->'orders') with ordinality row(value,ordinality) join public.orders o on o.id=(row.value->>'id')::uuid),'[]'::jsonb));
end $$;
create function app_private.prevent_store_close_with_tables() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='CLOSED' and old.status='OPEN' and exists(select 1 from public.table_sessions where store_session_id=new.id and closed_at is null) then raise exception 'Close active dining tables before closing the store.'; end if;
 return new;
end $$;
revoke all on function app_private.prevent_store_close_with_tables() from public,anon,authenticated;
create trigger store_close_requires_closed_tables before update of status on public.store_sessions for each row execute function app_private.prevent_store_close_with_tables();

alter function public.get_store_management(uuid) rename to get_store_management_before_dining;
revoke all on function public.get_store_management_before_dining(uuid) from public,anon,authenticated;
create function public.get_store_management(target_shop_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare payload jsonb; n integer;
begin
 payload:=public.get_store_management_before_dining(target_shop_id);
 if payload->'activeSession'<>'null'::jsonb then
  select count(*) into n from public.table_sessions where shop_id=target_shop_id and store_session_id=(payload->'activeSession'->>'id')::uuid and closed_at is null;
  payload:=jsonb_set(payload,'{activeSession,pendingTableCount}',to_jsonb(n));
 end if;
 return payload;
end $$;
revoke all on function public.get_store_management(uuid) from public,anon;
grant execute on function public.get_store_management(uuid) to authenticated;

-- All new callable functions have explicit, minimal grants.
revoke all on function public.save_dining_table(uuid,text),public.open_dining_table(uuid),public.list_dining_tables(uuid),
 public.get_table_bill(uuid),public.set_table_bill_checkout(uuid,boolean),public.create_table_pos_order(uuid,uuid,uuid,jsonb,text),
 public.close_dining_table(uuid),public.pay_table_bill(uuid,public.payment_method,integer,uuid,text),
 public.update_order_status(uuid,public.order_status,public.order_status,text),public.record_order_payment(uuid,public.payment_method,integer),
 public.list_active_staff_orders(uuid) from public,anon;
grant execute on function public.save_dining_table(uuid,text),public.open_dining_table(uuid),public.list_dining_tables(uuid),
 public.get_table_bill(uuid),public.set_table_bill_checkout(uuid,boolean),public.create_table_pos_order(uuid,uuid,uuid,jsonb,text),
 public.close_dining_table(uuid),public.pay_table_bill(uuid,public.payment_method,integer,uuid,text),
 public.update_order_status(uuid,public.order_status,public.order_status,text),public.record_order_payment(uuid,public.payment_method,integer),
 public.list_active_staff_orders(uuid) to authenticated;
revoke all on function public.get_dining_table_context(uuid),public.track_table_round(uuid),public.cancel_customer_order(uuid) from public;
grant execute on function public.get_dining_table_context(uuid),public.track_table_round(uuid),public.cancel_customer_order(uuid) to anon,authenticated;
create function public.cancel_table_guest_order(guest_token uuid, target_order_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare target public.orders; b public.table_bills; token_hash text;
begin
 token_hash:=encode(extensions.digest(guest_token::text,'sha256'),'hex');
 select * into target from public.orders where id=target_order_id and table_guest_hash=token_hash;
 if target.id is null then raise exception using errcode='P0002',message='Order not found.'; end if;
 b:=app_private.lock_table_bill(target.table_bill_id);
 if b.status<>'OPEN' then raise exception 'Reopen the bill before cancellation.'; end if;
 select * into target from public.orders where id=target.id for update;
 if target.status='CANCELLED' then return; end if;
 if target.status<>'QUEUED' then raise exception 'Preparation has started. Please contact the shop.'; end if;
 if target.payment_status<>'UNPAID' then raise exception 'Please contact the shop to cancel a paid order.'; end if;
 update public.orders set status='CANCELLED' where id=target.id;
 insert into public.order_events(order_id,shop_id,from_status,to_status,metadata)
 values(target.id,target.shop_id,'QUEUED','CANCELLED',jsonb_build_object('source','CUSTOMER','reason','Cancelled before preparation'));
 insert into public.audit_logs(shop_id,action,entity_type,entity_id) values(target.shop_id,'CUSTOMER_ORDER_CANCELLED','order',target.id);
end $$;
revoke all on function public.cancel_table_guest_order(uuid,uuid) from public;
grant execute on function public.cancel_table_guest_order(uuid,uuid) to anon,authenticated;
commit;
