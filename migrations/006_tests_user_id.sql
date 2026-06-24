-- Migration 006: Add user_id to tests
-- Enables per-user data isolation. human tests are owned by the authenticated user.
-- Putih tests have user_id = NULL (shared, accessible to all authenticated users).

alter table tests
  add column if not exists user_id uuid references auth.users(id);

-- After running this migration:
-- 1. Create both user accounts in Supabase Auth dashboard
-- 2. Get your user UUID from Authentication > Users
-- 3. Run this update to assign existing human tests to your account:
--    UPDATE tests SET user_id = '<your-uuid-here>' WHERE subject = 'human';
-- Putih tests stay NULL (shared access).
