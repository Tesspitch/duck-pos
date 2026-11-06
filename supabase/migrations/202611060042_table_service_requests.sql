begin;
create table public.table_service_requests (
 id uuid primary key default extensions.gen_random_uuid(),
 shop_id uuid not null references public.shops(id),
 table_id uuid not null references public.dining_tables(id),
 request_type text not null check (request_type in ('STAFF','BILL','CUTLERY','CONDIMENTS')),
 created_at timestamptz not null default now(),
 acknowledged_at timestamptz,
 acknowledged_by uuid references auth.users(id)
);
create index table_service_requests_pending on public.table_service_requests(shop_id,created_at) where acknowledged_at is null;
alter table public.table_service_requests enable row level security;
revoke all on public.table_service_requests from anon, authenticated;

create function public.request_table_service(table_qr_token uuid, service_type text) returns void
language plpgsql security definer set search_path='' as $$
declare t public.dining_tables;
begin
 if service_type not in ('STAFF','BILL','CUTLERY','CONDIMENTS') or service_type is null then raise exception 'Invalid request type.'; end if;
 select * into t from public.dining_tables where qr_token=table_qr_token and is_active for update;
 if not found or not exists(select 1 from public.shops where id=t.shop_id and deleted_at is null) then raise exception 'Table not found.'; end if;
 if not exists(select 1 from public.store_sessions where shop_id=t.shop_id and status='OPEN') then raise exception 'Shop is closed.'; end if;
 if exists(select 1 from public.table_service_requests where table_id=t.id and request_type=service_type and acknowledged_at is null) then return; end if;
 if (select count(*) from public.table_service_requests where table_id=t.id and created_at > now()-interval '1 minute') >= 4 then raise exception 'Please wait before requesting again.'; end if;
 insert into public.table_service_requests(shop_id,table_id,request_type) values(t.shop_id,t.id,service_type);
end $$;
revoke all on function public.request_table_service(uuid,text) from public;
grant execute on function public.request_table_service(uuid,text) to anon,authenticated;

create function public.list_table_service_requests(target_shop_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not app_private.is_active_shop_member(target_shop_id) then raise exception using errcode='42501',message='Active shop membership is required.'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'tableName',t.name,'type',r.request_type,'createdAt',r.created_at) order by r.created_at) from public.table_service_requests r join public.dining_tables t on t.id=r.table_id where r.shop_id=target_shop_id and r.acknowledged_at is null),'[]'::jsonb);
end $$;
revoke all on function public.list_table_service_requests(uuid) from public,anon;
grant execute on function public.list_table_service_requests(uuid) to authenticated;

create function public.acknowledge_table_service_request(request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare sid uuid;
begin
 select shop_id into sid from public.table_service_requests where id=request_id;
 if sid is null or not app_private.is_active_shop_member(sid) then raise exception using errcode='42501',message='Active shop membership is required.'; end if;
 update public.table_service_requests set acknowledged_at=now(),acknowledged_by=auth.uid() where id=request_id and acknowledged_at is null;
end $$;
revoke all on function public.acknowledge_table_service_request(uuid) from public,anon;
grant execute on function public.acknowledge_table_service_request(uuid) to authenticated;
commit;
