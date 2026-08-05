-- Migration 031: High coffee consumption flag on day records
ALTER TABLE glucomove_day_records
  ADD COLUMN IF NOT EXISTS high_coffee boolean default false;
