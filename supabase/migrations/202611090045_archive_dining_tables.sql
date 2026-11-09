begin;

-- Keep historical table references and allow a new table to reuse an archived name.
alter table public.dining_tables drop constraint dining_tables_shop_id_name_key;
create unique index dining_tables_active_name_key
  on public.dining_tables (shop_id, name) where is_active;

create or replace function public.save_dining_table(target_shop_id uuid, table_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare saved uuid;
begin
  if not app_private.is_active_shop_member(target_shop_id, array['OWNER']::public.shop_role[]) then
    raise exception using errcode = '42501', message = 'Owner access required.';
  end if;

  perform 1 from public.shops where id = target_shop_id and deleted_at is null for no key update;
  if not found then raise exception 'Shop is unavailable.'; end if;

  if (select count(*) from public.dining_tables where shop_id = target_shop_id and is_active) >= 200 then
    raise exception 'Maximum 200 tables per shop.';
  end if;
  insert into public.dining_tables(shop_id, name)
  values(target_shop_id, btrim(table_name)) returning id into saved;
  insert into public.audit_logs(shop_id, actor_user_id, action, entity_type, entity_id)
  values(target_shop_id, auth.uid(), 'DINING_TABLE_CREATED', 'dining_table', saved);
  return saved;
end $$;

create function public.archive_dining_table(target_shop_id uuid, target_table_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare table_active boolean;
begin
  if not app_private.is_active_shop_member(target_shop_id, array['OWNER']::public.shop_role[]) then
    raise exception using errcode = '42501', message = 'Owner access required.';
  end if;

  perform 1 from public.shops where id = target_shop_id and deleted_at is null for share;
  if not found then raise exception 'Shop is unavailable.'; end if;

  -- Opening a round takes this same table lock before inserting a session.
  select is_active into table_active from public.dining_tables
  where shop_id = target_shop_id and id = target_table_id for update;
  if not found then raise exception 'Table not found.'; end if;
  if not table_active then return; end if;

  if exists (
    select 1 from public.table_sessions
    where table_id = target_table_id and closed_at is null
  ) then
    raise exception 'Close the active table round before deleting this table.';
  end if;

  update public.dining_tables set is_active = false where id = target_table_id;
  insert into public.audit_logs(shop_id, actor_user_id, action, entity_type, entity_id)
  values(target_shop_id, auth.uid(), 'DINING_TABLE_ARCHIVED', 'dining_table', target_table_id);
end $$;

revoke all on function public.archive_dining_table(uuid, uuid) from public, anon, authenticated;
grant execute on function public.archive_dining_table(uuid, uuid) to authenticated;

commit;
