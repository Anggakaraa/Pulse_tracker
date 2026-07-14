-- Migration 010: Add symptoms_description column to putih_episodes
alter table putih_episodes add column symptoms_description text;
