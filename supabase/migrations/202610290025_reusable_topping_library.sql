begin;

create table public.topping_groups (
  id uuid primary key default extensions.gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1 check (max_select >= 1),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topping_groups_selection_range check (min_select <= max_select),
  constraint topping_groups_shop_id_id_unique unique (shop_id, id)
);

create unique index topping_groups_shop_name_unique
  on public.topping_groups (shop_id, lower(btrim(name)));
create index topping_groups_shop_sort_idx
  on public.topping_groups (shop_id, sort_order, name);

create table public.toppings (
  id uuid primary key default extensions.gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  topping_group_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  price_delta_satang integer not null default 0 check (price_delta_satang >= 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_visible boolean not null default true,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint toppings_group_same_shop_fkey
    foreign key (shop_id, topping_group_id)
    references public.topping_groups (shop_id, id)
    on delete cascade
);

create unique index toppings_group_name_unique
  on public.toppings (topping_group_id, lower(btrim(name)));
create index toppings_group_sort_idx
  on public.toppings (shop_id, topping_group_id, sort_order, name);

create table public.category_topping_groups (
  shop_id uuid not null references public.shops(id) on delete restrict,
  category_id uuid not null,
  topping_group_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (category_id, topping_group_id),
  constraint category_topping_groups_category_same_shop_fkey
    foreign key (shop_id, category_id)
    references public.categories (shop_id, id)
    on delete cascade,
  constraint category_topping_groups_group_same_shop_fkey
    foreign key (shop_id, topping_group_id)
    references public.topping_groups (shop_id, id)
    on delete cascade
);

create index category_topping_groups_shop_category_idx
  on public.category_topping_groups (shop_id, category_id, topping_group_id);

create trigger topping_groups_set_updated_at
before update on public.topping_groups
for each row execute function app_private.set_updated_at();

create trigger toppings_set_updated_at
before update on public.toppings
for each row execute function app_private.set_updated_at();

alter table public.topping_groups enable row level security;
alter table public.toppings enable row level security;
alter table public.category_topping_groups enable row level security;

revoke all on table public.topping_groups, public.toppings, public.category_topping_groups
  from anon, authenticated;

alter table public.option_groups
  add column topping_group_id uuid references public.topping_groups(id) on delete restrict;
alter table public.product_options
  add column topping_id uuid references public.toppings(id) on delete restrict;

-- Convert existing per-product groups into reusable shop-level templates.
create temporary table legacy_topping_seeds on commit drop as
select
  extensions.gen_random_uuid() as id,
  source.shop_id,
  source.normalized_name,
  source.name,
  source.min_select,
  source.max_select,
  source.sort_order,
  source.is_visible
from (
  select distinct on (option_group.shop_id, lower(btrim(option_group.name)))
    option_group.shop_id,
    lower(btrim(option_group.name)) as normalized_name,
    option_group.name,
    option_group.min_select,
    option_group.max_select,
    option_group.sort_order,
    option_group.is_visible
  from public.option_groups as option_group
  order by option_group.shop_id, lower(btrim(option_group.name)), option_group.created_at, option_group.id
) as source;

insert into public.topping_groups (
  id, shop_id, name, min_select, max_select, sort_order, is_visible
)
select id, shop_id, name, min_select, max_select, sort_order, is_visible
from legacy_topping_seeds;

insert into public.category_topping_groups (shop_id, category_id, topping_group_id)
select distinct product.shop_id, product.category_id, seed.id
from public.option_groups as option_group
join public.products as product on product.id = option_group.product_id and product.shop_id = option_group.shop_id
join legacy_topping_seeds as seed
  on seed.shop_id = option_group.shop_id
 and seed.normalized_name = lower(btrim(option_group.name));

insert into public.toppings (
  id, shop_id, topping_group_id, name, price_delta_satang,
  sort_order, is_visible, is_available
)
select
  extensions.gen_random_uuid(), source.shop_id, source.topping_group_id,
  source.name, source.price_delta_satang, source.sort_order,
  source.is_visible, source.is_available
from (
  select distinct on (seed.id, lower(btrim(product_option.name)))
    product_option.shop_id,
    seed.id as topping_group_id,
    product_option.name,
    product_option.price_delta_satang,
    product_option.sort_order,
    product_option.is_visible,
    product_option.is_available
  from public.product_options as product_option
  join public.option_groups as option_group
    on option_group.id = product_option.option_group_id
   and option_group.shop_id = product_option.shop_id
  join legacy_topping_seeds as seed
    on seed.shop_id = option_group.shop_id
   and seed.normalized_name = lower(btrim(option_group.name))
  order by seed.id, lower(btrim(product_option.name)), product_option.created_at, product_option.id
) as source;

create temporary table legacy_group_links on commit drop as
select option_group.id, seed.id as topping_group_id,
  row_number() over (
    partition by option_group.product_id, seed.id
    order by option_group.created_at, option_group.id
  ) as link_rank
from public.option_groups as option_group
join legacy_topping_seeds as seed
  on seed.shop_id = option_group.shop_id
 and seed.normalized_name = lower(btrim(option_group.name));

update public.option_groups as option_group
set topping_group_id = link.topping_group_id,
    is_visible = case when link.link_rank = 1 then option_group.is_visible else false end
from legacy_group_links as link
where link.id = option_group.id and link.link_rank = 1;

update public.option_groups as option_group
set is_visible = false
from legacy_group_links as link
where link.id = option_group.id and link.link_rank > 1;

create temporary table legacy_option_links on commit drop as
select product_option.id, topping.id as topping_id,
  row_number() over (
    partition by product_option.option_group_id, topping.id
    order by product_option.created_at, product_option.id
  ) as link_rank
from public.product_options as product_option
join public.option_groups as option_group on option_group.id = product_option.option_group_id
join public.toppings as topping
  on topping.topping_group_id = option_group.topping_group_id
 and lower(btrim(topping.name)) = lower(btrim(product_option.name))
where option_group.topping_group_id is not null;

update public.product_options as product_option
set topping_id = link.topping_id,
    is_visible = case when link.link_rank = 1 then product_option.is_visible else false end,
    is_available = case when link.link_rank = 1 then product_option.is_available else false end
from legacy_option_links as link
where link.id = product_option.id and link.link_rank = 1;

update public.product_options as product_option
set is_visible = false, is_available = false
from legacy_option_links as link
where link.id = product_option.id and link.link_rank > 1;

create unique index option_groups_product_topping_group_unique
  on public.option_groups (product_id, topping_group_id)
  where topping_group_id is not null;
create unique index product_options_group_topping_unique
  on public.product_options (option_group_id, topping_id)
  where topping_id is not null;

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
begin
  select * into group_row
  from public.topping_groups
  where id = target_topping_group_id;

  if group_row.id is null then
    raise exception using errcode = 'P0002', message = 'Topping group not found.';
  end if;

  update public.option_groups
  set is_visible = false
  where topping_group_id = group_row.id;

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
    where product_id = product_row.id
      and topping_group_id = group_row.id
    for update;

    if clone_group_id is null then
      insert into public.option_groups (
        shop_id, product_id, topping_group_id, name,
        min_select, max_select, sort_order, is_visible
      ) values (
        group_row.shop_id, product_row.id, group_row.id, group_row.name,
        group_row.min_select, group_row.max_select, group_row.sort_order, group_row.is_visible
      ) returning id into clone_group_id;
    else
      update public.option_groups
      set name = group_row.name,
          min_select = group_row.min_select,
          max_select = group_row.max_select,
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
        topping_row.price_delta_satang, topping_row.sort_order,
        topping_row.is_visible, topping_row.is_available
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

create or replace function app_private.sync_product_toppings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  group_id uuid;
begin
  update public.option_groups as option_group
  set is_visible = false
  where option_group.product_id = new.id
    and option_group.topping_group_id is not null
    and not exists (
      select 1 from public.category_topping_groups as mapping
      where mapping.shop_id = new.shop_id
        and mapping.category_id = new.category_id
        and mapping.topping_group_id = option_group.topping_group_id
    );

  for group_id in
    select mapping.topping_group_id
    from public.category_topping_groups as mapping
    where mapping.shop_id = new.shop_id and mapping.category_id = new.category_id
  loop
    perform app_private.sync_topping_group(group_id);
  end loop;
  return new;
end;
$$;

create trigger products_sync_reusable_toppings
after insert or update of category_id on public.products
for each row execute function app_private.sync_product_toppings();

create or replace function public.get_topping_library(target_shop_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app_private.require_catalog_role(
    target_shop_id,
    array['OWNER', 'STAFF']::public.shop_role[]
  );

  return jsonb_build_object(
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', category.id, 'name', category.name)
        order by category.sort_order, category.name)
      from public.categories as category
      where category.shop_id = target_shop_id
    ), '[]'::jsonb),
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', topping_group.id,
        'name', topping_group.name,
        'minSelect', topping_group.min_select,
        'maxSelect', topping_group.max_select,
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
          from public.toppings as topping
          where topping.topping_group_id = topping_group.id
        ), '[]'::jsonb)
      ) order by topping_group.sort_order, topping_group.name)
      from public.topping_groups as topping_group
      where topping_group.shop_id = target_shop_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.save_topping_group(
  target_shop_id uuid,
  target_topping_group_id uuid,
  topping_group_name text,
  topping_group_min_select integer,
  topping_group_max_select integer,
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

  if topping_group_min_select < 0 or topping_group_max_select < 1
     or topping_group_min_select > topping_group_max_select then
    raise exception using errcode = '22023', message = 'Invalid topping selection range.';
  end if;

  select count(distinct value)::integer into requested_category_count
  from unnest(coalesce(selected_category_ids, '{}'::uuid[])) as value;
  if requested_category_count = 0 then
    raise exception using errcode = '22023', message = 'Select at least one menu category.';
  end if;

  select count(*)::integer into valid_category_count
  from public.categories
  where shop_id = target_shop_id and id = any(selected_category_ids);
  if valid_category_count <> requested_category_count then
    raise exception using errcode = '23503', message = 'A selected category does not belong to this shop.';
  end if;

  if target_topping_group_id is null then
    select coalesce(max(sort_order), -1) + 1 into saved_sort_order
    from public.topping_groups where shop_id = target_shop_id;
    insert into public.topping_groups (
      shop_id, name, min_select, max_select, sort_order, is_visible
    ) values (
      target_shop_id, btrim(topping_group_name), topping_group_min_select,
      topping_group_max_select, saved_sort_order, topping_group_is_visible
    ) returning id into saved_id;
  else
    update public.topping_groups
    set name = btrim(topping_group_name),
        min_select = topping_group_min_select,
        max_select = topping_group_max_select,
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
    jsonb_build_object('name', btrim(topping_group_name), 'category_count', requested_category_count)
  );
  return saved_id;
end;
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
begin
  perform app_private.require_catalog_role(target_shop_id, array['OWNER']::public.shop_role[]);
  if not exists (
    select 1 from public.topping_groups
    where id = target_topping_group_id and shop_id = target_shop_id
  ) then raise exception using errcode = '23503', message = 'Topping group does not belong to this shop.'; end if;
  if topping_price_delta_satang < 0 then raise exception using errcode = '22023', message = 'Topping price cannot be negative.'; end if;

  if target_topping_id is null then
    select coalesce(max(sort_order), -1) + 1 into saved_sort_order
    from public.toppings where topping_group_id = target_topping_group_id;
    insert into public.toppings (
      shop_id, topping_group_id, name, price_delta_satang,
      sort_order, is_visible, is_available
    ) values (
      target_shop_id, target_topping_group_id, btrim(topping_name),
      topping_price_delta_satang, saved_sort_order, topping_is_visible, topping_is_available
    ) returning id into saved_id;
  else
    update public.toppings
    set name = btrim(topping_name),
        price_delta_satang = topping_price_delta_satang,
        is_visible = topping_is_visible,
        is_available = topping_is_available
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

create or replace function public.set_topping_availability(
  target_shop_id uuid,
  target_topping_id uuid,
  topping_is_available boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  group_id uuid;
begin
  perform app_private.require_catalog_role(target_shop_id, array['OWNER', 'STAFF']::public.shop_role[]);
  update public.toppings set is_available = topping_is_available
  where id = target_topping_id and shop_id = target_shop_id
  returning topping_group_id into group_id;
  if group_id is null then raise exception using errcode = 'P0002', message = 'Topping not found.'; end if;
  perform app_private.sync_topping_group(group_id);
  perform app_private.write_catalog_audit(
    target_shop_id, 'TOPPING_AVAILABILITY_CHANGED', 'topping', target_topping_id,
    jsonb_build_object('is_available', topping_is_available)
  );
end;
$$;

create or replace function public.delete_topping(
  target_shop_id uuid,
  target_topping_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  group_id uuid;
begin
  perform app_private.require_catalog_role(target_shop_id, array['OWNER']::public.shop_role[]);
  select topping_group_id into group_id from public.toppings
  where id = target_topping_id and shop_id = target_shop_id for update;
  if group_id is null then raise exception using errcode = 'P0002', message = 'Topping not found.'; end if;
  update public.product_options set topping_id = null, is_visible = false, is_available = false
  where topping_id = target_topping_id;
  delete from public.toppings where id = target_topping_id;
  perform app_private.sync_topping_group(group_id);
  perform app_private.write_catalog_audit(target_shop_id, 'TOPPING_DELETED', 'topping', target_topping_id);
end;
$$;

create or replace function public.delete_topping_group(
  target_shop_id uuid,
  target_topping_group_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.require_catalog_role(target_shop_id, array['OWNER']::public.shop_role[]);
  if not exists (
    select 1 from public.topping_groups
    where id = target_topping_group_id and shop_id = target_shop_id
  ) then raise exception using errcode = 'P0002', message = 'Topping group not found.'; end if;
  update public.product_options as product_option
  set topping_id = null, is_visible = false, is_available = false
  from public.option_groups as option_group
  where option_group.topping_group_id = target_topping_group_id
    and product_option.option_group_id = option_group.id;
  update public.option_groups
  set topping_group_id = null, is_visible = false
  where topping_group_id = target_topping_group_id;
  delete from public.topping_groups where id = target_topping_group_id;
  perform app_private.write_catalog_audit(target_shop_id, 'TOPPING_GROUP_DELETED', 'topping_group', target_topping_group_id);
end;
$$;

do $$
declare
  group_id uuid;
begin
  for group_id in select id from public.topping_groups loop
    perform app_private.sync_topping_group(group_id);
  end loop;
end;
$$;

revoke execute on function app_private.sync_topping_group(uuid) from public, anon, authenticated;
revoke execute on function app_private.sync_product_toppings() from public, anon, authenticated;

revoke execute on function public.get_topping_library(uuid) from public, anon;
revoke execute on function public.save_topping_group(uuid, uuid, text, integer, integer, boolean, uuid[]) from public, anon;
revoke execute on function public.save_topping(uuid, uuid, uuid, text, integer, boolean, boolean) from public, anon;
revoke execute on function public.set_topping_availability(uuid, uuid, boolean) from public, anon;
revoke execute on function public.delete_topping(uuid, uuid) from public, anon;
revoke execute on function public.delete_topping_group(uuid, uuid) from public, anon;

grant execute on function public.get_topping_library(uuid) to authenticated;
grant execute on function public.save_topping_group(uuid, uuid, text, integer, integer, boolean, uuid[]) to authenticated;
grant execute on function public.save_topping(uuid, uuid, uuid, text, integer, boolean, boolean) to authenticated;
grant execute on function public.set_topping_availability(uuid, uuid, boolean) to authenticated;
grant execute on function public.delete_topping(uuid, uuid) to authenticated;
grant execute on function public.delete_topping_group(uuid, uuid) to authenticated;

commit;
