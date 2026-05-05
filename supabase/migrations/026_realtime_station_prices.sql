-- ============================================================================
-- FuelMap Armenia — Phase 26: enable Realtime on station_prices
--
-- Supabase ships with a `supabase_realtime` publication that the Realtime
-- service subscribes to. Tables aren't in it by default — they have to be
-- added one by one. Until this runs, the stations-store WebSocket
-- subscription will connect successfully but never receive any events.
--
-- Idempotent — wraps the ALTER PUBLICATION in a check so re-running the
-- migration won't error.
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'station_prices'
  ) then
    execute 'alter publication supabase_realtime add table public.station_prices';
  end if;
end $$;
