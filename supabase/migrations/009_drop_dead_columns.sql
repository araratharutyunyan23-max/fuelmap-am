-- ============================================================================
-- FuelMap Armenia — Phase 9: drop dead columns
--
-- These columns were carried from the v0.dev mock and never wired up:
--   * stations.hours      — opening hours from OSM, not rendered anywhere
--   * station_prices.trend — always 0 (scraper never computed delta)
-- Removing them shrinks the schema and prevents accidental reuse.
-- Run via Management API or Dashboard SQL Editor.
-- ============================================================================

alter table public.stations       drop column if exists hours;
alter table public.station_prices drop column if exists trend;
