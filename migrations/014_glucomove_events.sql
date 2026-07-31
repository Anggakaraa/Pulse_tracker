-- Migration 014: Glucomove events (non-meal glucose influencers)

create table glucomove_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) not null,
  name          text not null,
  event_type    text not null check (event_type in (
                  'stress', 'exercise', 'alcohol', 'illness',
                  'sleep', 'travel', 'fasting', 'other')),
  intensity     text check (intensity in ('low', 'moderate', 'high')),
  start_time    timestamptz not null,
  end_time      timestamptz,
  notes         text,
  created_at    timestamptz default now()
);

alter table glucomove_events enable row level security;

create policy "users manage own events"
  on glucomove_events for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
