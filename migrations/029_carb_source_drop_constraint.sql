-- Migration 029: drop the old text check constraint on primary_carb_source
-- The column was changed to text[] in migration 023, but the original
-- check constraint was never removed. The UI controls valid values so
-- no replacement constraint is needed.
ALTER TABLE glucomove_meals
  DROP CONSTRAINT IF EXISTS glucomove_meals_primary_carb_source_check;
