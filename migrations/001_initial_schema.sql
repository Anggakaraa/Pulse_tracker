-- Migration 001: Initial schema
-- Creates the four core tables: tests, readings, experiments, experiment_metrics.

create table if not exists tests (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  lab_name     text,
  notes        text,
  document_url text,
  created_at   timestamptz default now()
);

create table if not exists readings (
  id                  uuid primary key default gen_random_uuid(),
  test_id             uuid references tests(id) on delete cascade,
  metric_key          text not null,
  value               numeric not null,
  unit                text not null,
  original_value      numeric,
  original_unit       text,
  lab_range_low       numeric,
  lab_range_high      numeric,
  optimal_range_low   numeric,
  optimal_range_high  numeric,
  attention_state     text,
  annotation          text,
  created_at          timestamptz default now()
);

create table if not exists experiments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  hypothesis  text,
  start_date  date not null,
  end_date    date,
  status      text default 'active',
  created_at  timestamptz default now()
);

create table if not exists experiment_metrics (
  id              uuid primary key default gen_random_uuid(),
  experiment_id   uuid references experiments(id) on delete cascade,
  metric_key      text not null
);
