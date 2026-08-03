-- Track where each glucose reading came from
-- nightscout = synced from Nightscout API (CGM sensor via Ottai)
-- apple_health = imported via Apple Health shortcut
-- manual = entered by hand in the app
ALTER TABLE glucomove_readings
  ADD COLUMN IF NOT EXISTS source text;
