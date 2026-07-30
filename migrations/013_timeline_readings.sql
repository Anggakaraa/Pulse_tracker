-- Migration 013: Free-floating glucose readings + meal independence

-- 1. Meals no longer require a day record
alter table glucomove_meals alter column day_record_id drop not null;
alter table glucomove_meals drop constraint glucomove_meals_day_record_id_fkey;
alter table glucomove_meals
  add constraint glucomove_meals_day_record_id_fkey
  foreign key (day_record_id) references glucomove_day_records(id) on delete set null;

-- 2. Readings get a user_id so they can exist without meal_id
alter table glucomove_readings add column if not exists user_id uuid references auth.users(id);

-- Backfill user_id from their meals
update glucomove_readings r
set user_id = m.user_id
from glucomove_meals m
where r.meal_id = m.id;

-- 3. meal_id becomes optional (free-floating readings)
alter table glucomove_readings alter column meal_id drop not null;
alter table glucomove_readings drop constraint glucomove_readings_meal_id_fkey;
alter table glucomove_readings
  add constraint glucomove_readings_meal_id_fkey
  foreign key (meal_id) references glucomove_meals(id) on delete set null;

-- 4. Update RLS: allow readings owned via user_id OR via meal membership
drop policy if exists "users manage readings for own meals" on glucomove_readings;
create policy "users manage own readings"
  on glucomove_readings for all to authenticated
  using (
    user_id = auth.uid()
    or meal_id in (select id from glucomove_meals where user_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    or meal_id in (select id from glucomove_meals where user_id = auth.uid())
  );

-- 5. waking_glucose_mmol is no longer required on day records
alter table glucomove_day_records alter column waking_glucose_mmol drop not null;
