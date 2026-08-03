-- Granular sensor error windows on glucomove_day_records
-- Stored as [{start: "HH:MM", end: "HH:MM"}] in WIB time.
-- "00:00" end = rest of day; end < start = spans midnight.
-- Readings within these windows are excluded from daily analysis.
ALTER TABLE glucomove_day_records
  ADD COLUMN IF NOT EXISTS sensor_error_periods jsonb NOT NULL DEFAULT '[]';
