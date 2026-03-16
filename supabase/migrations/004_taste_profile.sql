-- ============================================================
-- 004_taste_profile.sql
-- Adds price range to profiles for taste-based feed filtering
-- Run: supabase db push  OR paste into Supabase SQL editor
-- ============================================================

alter table profiles
  add column if not exists price_min integer not null default 0,
  add column if not exists price_max integer not null default 50000;
