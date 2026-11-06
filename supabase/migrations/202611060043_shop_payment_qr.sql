begin;
create table public.shop_payment_qr (
 shop_id uuid primary key references public.shops(id),
 image_path text not null check (length(image_path)<300 and image_path like shop_id::text || '/payment/%')
);
alter table public.shop_payment_qr enable row level security;
grant select,insert,update,delete on public.shop_payment_qr to authenticated;
create policy payment_qr_read on public.shop_payment_qr for select to authenticated using (app_private.is_active_shop_member(shop_id));
create policy payment_qr_owner on public.shop_payment_qr for all to authenticated using (app_private.is_active_shop_member(shop_id,array['OWNER']::public.shop_role[])) with check (app_private.is_active_shop_member(shop_id,array['OWNER']::public.shop_role[]));
commit;
