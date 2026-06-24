-- Migration 008: Enable RLS and add access policies
-- Run AFTER migrations 006 and 007 AND after assigning user_ids to existing rows.

-- Enable RLS on all tables
alter table tests enable row level security;
alter table readings enable row level security;
alter table experiments enable row level security;
alter table experiment_metrics enable row level security;

-- TESTS:
-- Authenticated user can access their own human tests OR any Putih test (shared)
create policy "tests_access" on tests
  for all
  using (
    auth.uid() = user_id          -- own human tests
    or subject = 'putih'          -- shared Putih tests (user_id is NULL)
  )
  with check (
    auth.uid() = user_id          -- can only insert/update own rows
    or subject = 'putih'
  );

-- READINGS:
-- Accessible if the parent test is accessible (RLS on tests handles the filter)
create policy "readings_access" on readings
  for all
  using (
    test_id in (
      select id from tests
      where auth.uid() = user_id or subject = 'putih'
    )
  )
  with check (
    test_id in (
      select id from tests
      where auth.uid() = user_id or subject = 'putih'
    )
  );

-- EXPERIMENTS:
-- Authenticated user can only access their own experiments
create policy "experiments_access" on experiments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- EXPERIMENT_METRICS:
-- Accessible if the parent experiment is accessible
create policy "experiment_metrics_access" on experiment_metrics
  for all
  using (
    experiment_id in (
      select id from experiments where auth.uid() = user_id
    )
  )
  with check (
    experiment_id in (
      select id from experiments where auth.uid() = user_id
    )
  );
