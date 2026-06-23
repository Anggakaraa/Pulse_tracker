-- Migration 003: Add target_low and target_high to experiment_metrics
-- Supports target band visualisation in experiment progression table.

alter table experiment_metrics
  add column if not exists target_low  numeric,
  add column if not exists target_high numeric;
