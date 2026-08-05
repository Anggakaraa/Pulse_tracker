-- Migration 030: AI-generated day summary narrative on day records
ALTER TABLE glucomove_day_records
  ADD COLUMN IF NOT EXISTS narrative text;
