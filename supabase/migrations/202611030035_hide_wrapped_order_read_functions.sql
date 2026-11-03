begin;

-- These are implementation details retained only so the small wrapper
-- functions can amend the operational isOpen flag. Clients must use the
-- original public RPC names and cannot bypass the paused-intake state.
revoke execute on function public.get_public_menu_catalog(uuid) from public, anon, authenticated;
revoke execute on function public.list_active_staff_orders_core(uuid) from public, anon, authenticated;

commit;
