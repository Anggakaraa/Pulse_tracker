-- Migration 005: Add notes column to experiments
-- Supports free-text protocol notes on experiment detail page (auto-saved).

alter table experiments
  add column if not exists notes text;
