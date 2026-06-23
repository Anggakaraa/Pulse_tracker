-- Migration 002: Add column_labels and excluded_test_ids to experiments
-- Supports experiment progression table: user-editable column captions and hidden columns.

alter table experiments
  add column if not exists column_labels    jsonb default '{}',
  add column if not exists excluded_test_ids jsonb default '[]';

-- column_labels:    maps test_id (uuid string) → caption (string). Edited inline per column.
-- excluded_test_ids: array of test UUIDs hidden from this experiment's progression table.
