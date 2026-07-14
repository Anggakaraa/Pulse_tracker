-- Migration 009: Putih episode log
create table putih_episodes (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  suspected_trigger text,
  symptoms jsonb not null default '[]', -- array of symptom strings
  symptoms_other text,
  severity text not null check (severity in ('mild', 'moderate', 'severe')),
  action_taken text,
  recovery text,
  created_at timestamptz default now()
);

-- RLS: all authenticated users can read; any authenticated user can insert/update/delete
alter table putih_episodes enable row level security;

create policy "authenticated users can read putih_episodes"
  on putih_episodes for select
  to authenticated
  using (true);

create policy "authenticated users can insert putih_episodes"
  on putih_episodes for insert
  to authenticated
  with check (true);

create policy "authenticated users can update putih_episodes"
  on putih_episodes for update
  to authenticated
  using (true);

create policy "authenticated users can delete putih_episodes"
  on putih_episodes for delete
  to authenticated
  using (true);
