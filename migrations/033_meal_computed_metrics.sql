-- Migration 033: Store computed meal-level metrics on meals
ALTER TABLE glucomove_meals
  ADD COLUMN IF NOT EXISTS baseline_mmol numeric,
  ADD COLUMN IF NOT EXISTS spike_mmol numeric,
  ADD COLUMN IF NOT EXISTS iauc integer,
  ADD COLUMN IF NOT EXISTS response_band text,
  ADD COLUMN IF NOT EXISTS time_to_peak_min integer,
  ADD COLUMN IF NOT EXISTS recovery_time_min integer;
