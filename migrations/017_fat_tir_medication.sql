-- Fat fields on meals
alter table glucomove_meals
  add column if not exists fat_prominence text
    check (fat_prominence in ('low', 'moderate', 'high'));

alter table glucomove_meals
  add column if not exists fat_before boolean not null default false;

-- Time in Range on day records
alter table glucomove_day_records
  add column if not exists time_in_range_pct numeric
    check (time_in_range_pct >= 0 and time_in_range_pct <= 100);

-- Add medication to event types
alter table glucomove_events drop constraint if exists glucomove_events_event_type_check;
alter table glucomove_events add constraint glucomove_events_event_type_check
  check (event_type in ('stress', 'exercise', 'alcohol', 'illness', 'sleep', 'travel', 'fasting', 'medication', 'other'));
