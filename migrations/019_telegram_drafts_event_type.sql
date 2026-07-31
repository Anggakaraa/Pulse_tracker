-- Migration 019: add 'event' to telegram_drafts type constraint

alter table glucomove_telegram_drafts
  drop constraint if exists glucomove_telegram_drafts_type_check;

alter table glucomove_telegram_drafts
  add constraint glucomove_telegram_drafts_type_check
  check (type in ('day_record', 'meal', 'glucose_reading', 'event', 'unknown'));
