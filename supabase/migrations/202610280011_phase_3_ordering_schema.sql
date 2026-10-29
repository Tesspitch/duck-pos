begin;

create type public.store_session_status as enum ('OPEN', 'CLOSED');
create type public.order_source as enum ('QR', 'POS');
create type public.order_status as enum ('QUEUED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');
create type public.payment_status as enum ('UNPAID', 'PAID', 'REFUNDED');

create table public.store_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  business_date date not null,
  status public.store_session_status not null default 'OPEN',
  opened_at timestamptz not null default now(),
  opened_by uuid references public.user_profiles(id) on delete restrict,
  closed_at timestamptz,
  closed_by uuid references public.user_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint store_sessions_shop_id_id_unique unique (shop_id, id),
  constraint store_sessions_close_consistent check (
    (status = 'OPEN' and closed_at is null and closed_by is null)
    or (status = 'CLOSED' and closed_at is not null)
  )
);

create unique index store_sessions_one_open_per_shop_idx
  on public.store_sessions (shop_id) where status = 'OPEN';
create index store_sessions_shop_business_date_idx
  on public.store_sessions (shop_id, business_date desc, opened_at desc);

create table public.queue_counters (
  shop_id uuid not null references public.shops(id) on delete restrict,
  business_date date not null,
  last_number integer not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now(),
  primary key (shop_id, business_date)
);

create table public.checkout_rate_limits (
  shop_id uuid not null references public.shops(id) on delete cascade,
  client_fingerprint text not null check (char_length(client_fingerprint) = 64),
  window_started_at timestamptz not null,
  attempt_count integer not null check (attempt_count > 0),
  primary key (shop_id, client_fingerprint)
);

create table public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete restrict,
  store_session_id uuid not null,
  business_date date not null,
  queue_number integer not null check (queue_number > 0),
  order_reference text not null check (char_length(order_reference) between 8 and 40),
  source public.order_source not null,
  status public.order_status not null default 'QUEUED',
  payment_status public.payment_status not null default 'UNPAID',
  subtotal_satang integer not null check (subtotal_satang >= 0),
  total_satang integer not null check (total_satang >= 0),
  customer_note text not null default '' check (char_length(customer_note) <= 500),
  idempotency_key uuid not null,
  tracking_token_hash text not null check (char_length(tracking_token_hash) = 64),
  location_accuracy_m numeric(8,2),
  location_distance_m numeric(8,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_session_same_shop_fkey
    foreign key (shop_id, store_session_id)
    references public.store_sessions (shop_id, id)
    on delete restrict,
  constraint orders_shop_business_queue_unique unique (shop_id, business_date, queue_number),
  constraint orders_shop_reference_unique unique (shop_id, order_reference),
  constraint orders_shop_idempotency_unique unique (shop_id, idempotency_key),
  constraint orders_tracking_token_hash_unique unique (tracking_token_hash)
);

create index orders_shop_status_created_idx on public.orders (shop_id, status, created_at desc);
create index orders_tracking_token_hash_idx on public.orders (tracking_token_hash);

create table public.order_items (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  unit_price_satang integer not null check (unit_price_satang >= 0),
  quantity integer not null check (quantity between 1 and 20),
  item_note text not null default '' check (char_length(item_note) <= 300),
  line_total_satang integer not null check (line_total_satang >= 0),
  created_at timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id, created_at);

create table public.order_item_options (
  id uuid primary key default extensions.gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  product_option_id uuid not null references public.product_options(id) on delete restrict,
  option_name text not null,
  price_delta_satang integer not null check (price_delta_satang >= 0),
  created_at timestamptz not null default now()
);

create index order_item_options_item_idx on public.order_item_options (order_item_id, created_at);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete restrict,
  shop_id uuid not null references public.shops(id) on delete restrict,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_user_id uuid references public.user_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index order_events_order_created_idx on public.order_events (order_id, created_at, id);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function app_private.set_updated_at();

alter table public.store_sessions enable row level security;
alter table public.queue_counters enable row level security;
alter table public.checkout_rate_limits enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_options enable row level security;
alter table public.order_events enable row level security;

revoke all on table public.store_sessions, public.queue_counters, public.checkout_rate_limits, public.orders,
  public.order_items, public.order_item_options, public.order_events from anon, authenticated;
revoke all on sequence public.order_events_id_seq from anon, authenticated;

grant select on table public.store_sessions, public.orders, public.order_items,
  public.order_item_options, public.order_events to authenticated;

create policy store_sessions_select_member on public.store_sessions
for select to authenticated
using ((select app_private.is_active_shop_member(shop_id)));

create policy orders_select_member on public.orders
for select to authenticated
using ((select app_private.is_active_shop_member(shop_id)));

create policy order_items_select_member on public.order_items
for select to authenticated
using (exists (
  select 1 from public.orders as order_row
  where order_row.id = order_id
    and app_private.is_active_shop_member(order_row.shop_id)
));

create policy order_item_options_select_member on public.order_item_options
for select to authenticated
using (exists (
  select 1 from public.order_items as item
  join public.orders as order_row on order_row.id = item.order_id
  where item.id = order_item_id
    and app_private.is_active_shop_member(order_row.shop_id)
));

create policy order_events_select_member on public.order_events
for select to authenticated
using ((select app_private.is_active_shop_member(shop_id)));

commit;
