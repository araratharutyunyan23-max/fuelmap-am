-- ============================================================================
-- FuelMap Armenia — Phase 33: admin inline price edits on station detail
--
-- Until now station_prices was write-only via the service-role key
-- (scraper, brand-override trigger, confirmed price_report trigger).
-- To let an admin correct a price the moment they open a station from
-- the regular app UI, allow upsert/delete on station_prices when the
-- current authenticated user is an admin (private.admin_users).
--
-- Public SELECT policy from migration 001 stays intact; this one only
-- adds INSERT/UPDATE/DELETE for is_admin() callers.
-- ============================================================================

drop policy if exists "station_prices admin write" on public.station_prices;
create policy "station_prices admin write"
  on public.station_prices
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
