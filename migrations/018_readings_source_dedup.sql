-- Migration 018: readings source tracking + deduplication index for Apple Health sync

alter table glucomove_readings
  add column if not exists source text
    check (source in ('manual', 'telegram', 'apple_health'))
    default 'manual';

-- Unique index for deduplication: one reading per user per timestamp
-- Partial (where user_id is not null) to avoid conflicts on legacy rows without user_id
create unique index if not exists glucomove_readings_user_timestamp_unique
  on glucomove_readings (user_id, timestamp)
  where user_id is not null;
