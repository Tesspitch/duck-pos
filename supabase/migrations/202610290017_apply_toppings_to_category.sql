begin;

create or replace function public.apply_option_group_to_category(
  target_shop_id uuid,
  source_option_group_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_group public.option_groups;
  source_category_id uuid;
  target_product record;
  source_option public.product_options;
  target_group_id uuid;
  target_option_id uuid;
  target_product_count integer := 0;
  created_group_count integer := 0;
  updated_group_count integer := 0;
  inserted_option_count integer := 0;
  updated_option_count integer := 0;
begin
  perform app_private.require_catalog_role(
    target_shop_id,
    array['OWNER']::public.shop_role[]
  );

  select option_group.* into source_group
  from public.option_groups as option_group
  where option_group.id = source_option_group_id
    and option_group.shop_id = target_shop_id
  for update of option_group;

  if source_group.id is null then
    raise exception using errcode = 'P0002', message = 'Source option group not found.';
  end if;

  select product.category_id into source_category_id
  from public.products as product
  where product.id = source_group.product_id
    and product.shop_id = target_shop_id;

  for target_product in
    select product.id
    from public.products as product
    where product.shop_id = target_shop_id
      and product.category_id = source_category_id
      and product.id <> source_group.product_id
    order by product.id
    for update
  loop
    target_product_count := target_product_count + 1;
    target_group_id := null;

    select option_group.id into target_group_id
    from public.option_groups as option_group
    where option_group.shop_id = target_shop_id
      and option_group.product_id = target_product.id
      and lower(btrim(option_group.name)) = lower(btrim(source_group.name))
    order by option_group.created_at, option_group.id
    limit 1
    for update;

    if target_group_id is null then
      insert into public.option_groups (
        shop_id, product_id, name, min_select, max_select, sort_order, is_visible
      ) values (
        target_shop_id, target_product.id, source_group.name, source_group.min_select,
        source_group.max_select, source_group.sort_order, source_group.is_visible
      ) returning id into target_group_id;
      created_group_count := created_group_count + 1;
    else
      update public.option_groups
      set name = source_group.name,
          min_select = source_group.min_select,
          max_select = source_group.max_select,
          sort_order = source_group.sort_order,
          is_visible = source_group.is_visible
      where id = target_group_id;
      updated_group_count := updated_group_count + 1;
    end if;

    for source_option in
      select *
      from public.product_options
      where shop_id = target_shop_id
        and option_group_id = source_group.id
      order by sort_order, name, id
    loop
      target_option_id := null;
      select product_option.id into target_option_id
      from public.product_options as product_option
      where product_option.shop_id = target_shop_id
        and product_option.option_group_id = target_group_id
        and lower(btrim(product_option.name)) = lower(btrim(source_option.name))
      order by product_option.created_at, product_option.id
      limit 1
      for update;

      if target_option_id is null then
        insert into public.product_options (
          shop_id, option_group_id, name, price_delta_satang,
          sort_order, is_visible, is_available
        ) values (
          target_shop_id, target_group_id, source_option.name, source_option.price_delta_satang,
          source_option.sort_order, source_option.is_visible, source_option.is_available
        );
        inserted_option_count := inserted_option_count + 1;
      else
        update public.product_options
        set name = source_option.name,
            price_delta_satang = source_option.price_delta_satang,
            sort_order = source_option.sort_order,
            is_visible = source_option.is_visible,
            is_available = source_option.is_available
        where id = target_option_id;
        updated_option_count := updated_option_count + 1;
      end if;
    end loop;
  end loop;

  perform app_private.write_catalog_audit(
    target_shop_id,
    'OPTION_GROUP_APPLIED_TO_CATEGORY',
    'option_group',
    source_group.id,
    jsonb_build_object(
      'category_id', source_category_id,
      'target_product_count', target_product_count,
      'created_group_count', created_group_count,
      'updated_group_count', updated_group_count,
      'inserted_option_count', inserted_option_count,
      'updated_option_count', updated_option_count
    )
  );

  return jsonb_build_object(
    'targetProductCount', target_product_count,
    'createdGroupCount', created_group_count,
    'updatedGroupCount', updated_group_count,
    'insertedOptionCount', inserted_option_count,
    'updatedOptionCount', updated_option_count
  );
end;
$$;

revoke execute on function public.apply_option_group_to_category(uuid, uuid) from public, anon;
grant execute on function public.apply_option_group_to_category(uuid, uuid) to authenticated;

commit;
