-- Migration 007: Add user_id to experiments
-- Experiments are human-only and owned by the authenticated user.

alter table experiments
  add column if not exists user_id uuid references auth.users(id);

-- After running this migration:
-- UPDATE experiments SET user_id = '<your-uuid-here>';
