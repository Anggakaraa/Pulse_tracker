-- Migration 004: Add subject column to tests
-- Separates human and Putih (dog) health records in the same tests table.
-- Default 'human' ensures all existing rows remain attributed to the human subject.

alter table tests
  add column if not exists subject text not null default 'human';

-- Valid values: 'human' | 'putih'
-- All queries for human data must filter: .eq("subject", "human")
-- All queries for Putih data must filter: .eq("subject", "putih")
