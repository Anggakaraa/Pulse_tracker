-- Add day-level context flags to glucomove_day_records
-- These are confounders that affect the whole day's glucose picture,
-- not individual meals.
ALTER TABLE glucomove_day_records
  ADD COLUMN IF NOT EXISTS bad_sleep boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alcohol_previous_night boolean NOT NULL DEFAULT false;
