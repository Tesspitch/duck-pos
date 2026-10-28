begin;

create table public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_shop_id_id_unique unique (shop_id, id)
);

create index categories_shop_sort_idx
  on public.categories (shop_id, sort_order, name);

create table public.products (
  id uuid primary key default extensions.gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  category_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  base_price_satang integer not null check (base_price_satang >= 0),
  image_path text check (
    image_path is null
    or (
      char_length(image_path) between 1 and 500
      and image_path !~ '(^|/)\.\.(/|$)'
    )
  ),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_visible boolean not null default true,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_shop_id_id_unique unique (shop_id, id),
  constraint products_category_same_shop_fkey
    foreign key (shop_id, category_id)
    references public.categories (shop_id, id)
    on delete restrict
);

create index products_category_sort_idx
  on public.products (shop_id, category_id, sort_order, name);
create index products_shop_available_idx
  on public.products (shop_id, is_visible, is_available, sort_order)
  where is_visible = true;

create table public.option_groups (
  id uuid primary key default extensions.gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  product_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1 check (max_select >= 1),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint option_groups_selection_range check (min_select <= max_select),
  constraint option_groups_shop_id_id_unique unique (shop_id, id),
  constraint option_groups_product_same_shop_fkey
    foreign key (shop_id, product_id)
    references public.products (shop_id, id)
    on delete cascade
);

create index option_groups_product_sort_idx
  on public.option_groups (shop_id, product_id, sort_order, name);

create table public.product_options (
  id uuid primary key default extensions.gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  option_group_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  price_delta_satang integer not null default 0 check (price_delta_satang >= 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_visible boolean not null default true,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_options_group_same_shop_fkey
    foreign key (shop_id, option_group_id)
    references public.option_groups (shop_id, id)
    on delete cascade
);

create index product_options_group_sort_idx
  on public.product_options (shop_id, option_group_id, sort_order, name);
create index product_options_shop_available_idx
  on public.product_options (shop_id, is_visible, is_available)
  where is_visible = true;

create trigger categories_set_updated_at
before update on public.categories
for each row execute function app_private.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function app_private.set_updated_at();

create trigger option_groups_set_updated_at
before update on public.option_groups
for each row execute function app_private.set_updated_at();

create trigger product_options_set_updated_at
before update on public.product_options
for each row execute function app_private.set_updated_at();

commit;
