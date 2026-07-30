-- Migration 012: Telegram drafts for Glucomove

create table glucomove_telegram_drafts (
  id                   uuid primary key default gen_random_uuid(),
  type                 text not null check (type in ('day_record', 'meal', 'glucose_reading', 'unknown')),
  raw_message          text not null,
  parsed_data          jsonb not null default '{}',
  date                 date not null,
  status               text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  telegram_message_id  bigint,
  sent_at              timestamptz not null,
  created_at           timestamptz default now()
);

alter table glucomove_telegram_drafts enable row level security;

create policy "authenticated users can manage telegram drafts"
  on glucomove_telegram_drafts for all to authenticated
  using (true) with check (true);
