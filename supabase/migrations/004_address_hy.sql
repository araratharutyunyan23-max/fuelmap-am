-- ============================================================================
-- FuelMap Armenia — Phase 4: Armenian-language addresses
-- Run in Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================

-- Per-locale address. Nullable — if NULL the frontend falls back to `address`
-- (which is RU-preferred). Backfilled by scripts/enrich-addresses-hy.mjs.
alter table public.stations
  add column if not exists address_hy text;
