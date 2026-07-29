-- Migration 011: Glucomove — CGM meal-event glucose tracking

-- Day Records
create table glucomove_day_records (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references auth.users(id) not null,
  date                     date not null,
  waking_glucose_mmol      numeric(4,2) not null,
  overnight_avg_mmol       numeric(4,2),
  daily_avg_mmol           numeric(4,2),
  notes                    text,
  potential_sensor_issue   boolean not null default false,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now(),
  unique (user_id, date)
);

-- Meal Glucomoves
create table glucomove_meals (
  id                          uuid primary key default gen_random_uuid(),
  day_record_id               uuid references glucomove_day_records(id) on delete cascade not null,
  user_id                     uuid references auth.users(id) not null,
  meal_start_time             timestamptz not null,
  meal_type                   text not null check (meal_type in ('breakfast','lunch','dinner','snack','other')),
  name                        text not null,
  description                 text not null,
  primary_carb_source         text not null check (primary_carb_source in (
                                'none','white_rice','red_brown_rice','bread','fibrous_bread',
                                'pasta','wholewheat_pasta','noodles_flour','sugar_dessert',
                                'quinoa','cauliflower_rice','other')),
  additional_carb_sources     jsonb not null default '[]',
  carb_prominence             text not null check (carb_prominence in ('none','supporting','moderate','hero')),
  acv_before                  boolean not null default false,
  structured_eating           boolean not null default false,
  movement_after              boolean not null default false,
  movement_duration_minutes   integer,
  with_alcohol                boolean not null default false,
  cooled_starch               boolean not null default false,
  notes                       text,
  potential_sensor_issue      boolean not null default false,
  related_meal_id             uuid references glucomove_meals(id),
  relationship_type           text check (relationship_type in ('repeat_of','variation_of')),
  observation_ended_at        timestamptz,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

-- Glucose Readings
create table glucomove_readings (
  id              uuid primary key default gen_random_uuid(),
  meal_id         uuid references glucomove_meals(id) on delete cascade not null,
  timestamp       timestamptz not null,
  glucose_mmol    numeric(4,2) not null,
  is_baseline     boolean not null default false,
  created_at      timestamptz default now()
);

-- RLS
alter table glucomove_day_records enable row level security;
alter table glucomove_meals enable row level security;
alter table glucomove_readings enable row level security;

create policy "users manage own day records"
  on glucomove_day_records for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users manage own meals"
  on glucomove_meals for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users manage readings for own meals"
  on glucomove_readings for all to authenticated
  using (meal_id in (select id from glucomove_meals where user_id = auth.uid()))
  with check (meal_id in (select id from glucomove_meals where user_id = auth.uid()));
