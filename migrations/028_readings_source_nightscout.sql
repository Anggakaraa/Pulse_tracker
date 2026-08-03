-- Migration 028: add 'nightscout' to the allowed source values for glucomove_readings

ALTER TABLE glucomove_readings
  DROP CONSTRAINT IF EXISTS glucomove_readings_source_check;

ALTER TABLE glucomove_readings
  ADD CONSTRAINT glucomove_readings_source_check
  CHECK (source IN ('manual', 'telegram', 'apple_health', 'nightscout'));
