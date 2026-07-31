-- Migration 020: make waking_glucose_mmol nullable
-- Previously NOT NULL, but waking glucose is now auto-derived from
-- the closest CGM reading at wake-up time via Telegram "wake up" message.

alter table glucomove_day_records
  alter column waking_glucose_mmol drop not null;
