begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

select has_column('public', 'shops', 'logo_path', 'shops has logo path');
select ok(has_function_privilege('authenticated', 'public.update_my_profile(text)', 'EXECUTE'), 'authenticated can call self profile update');
select ok(not has_function_privilege('anon', 'public.update_my_profile(text)', 'EXECUTE'), 'anonymous cannot update profile');
select ok(
  not has_column_privilege('authenticated', 'public.user_profiles', 'display_name', 'UPDATE'),
  'profile display name cannot be updated directly'
);
select ok(has_function_privilege('authenticated', 'public.update_shop_branding(uuid,text,text)', 'EXECUTE'), 'authenticated can call owner-checked branding update');
select ok(not has_function_privilege('anon', 'public.update_shop_branding(uuid,text,text)', 'EXECUTE'), 'anonymous cannot update shop branding');
select ok(not has_table_privilege('authenticated', 'public.shops', 'UPDATE'), 'shop table cannot be updated directly');
select ok(
  exists (
    select 1 from storage.buckets
    where id = 'shop-assets' and public = true and file_size_limit = 2097152
  ),
  'shop asset bucket is public with a 2 MB upload limit'
);

select * from finish();
rollback;
