-- Phase 1 deliberately contains no default users, shops, or memberships.
-- Sign in through Google once, then provision the first owner from the SQL Editor:
--
-- select app_private.provision_first_owner(
--   '<supabase-auth-user-uuid>'::uuid,
--   'Duck Kebab',
--   'Asia/Bangkok',
--   'THB'
-- );

