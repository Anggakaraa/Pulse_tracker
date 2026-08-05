-- Migration 032: Store computed day-level metrics on day records
ALTER TABLE glucomove_day_records
  ADD COLUMN IF NOT EXISTS daily_avg_mmol numeric,
  ADD COLUMN IF NOT EXISTS overnight_avg_mmol numeric,
  ADD COLUMN IF NOT EXISTS twl_pct integer,
  ADD COLUMN IF NOT EXISTS cv_pct integer;
