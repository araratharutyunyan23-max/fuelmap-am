-- ============================================================================
-- FuelMap Armenia — Phase 13: per-user favorite stations
--
-- Star a station and it shows up in the map's "only favorites" filter and in
-- the profile's "Любимые АЗС" section. Will also be the targeting set for
-- price-drop push notifications when that feature lands (the alerts feature
-- in growth_plan.md Phase B).
-- ============================================================================

create table if not exists public.user_favorites (
  user_id    uuid not null references auth.users(id) on delete cascade,
  station_id text not null references public.stations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, station_id)
);

create index if not exists user_favorites_user_idx
  on public.user_favorites (user_id);
create index if not exists user_favorites_station_idx
  on public.user_favorites (station_id);

alter table public.user_favorites enable row level security;

drop policy if exists "users insert own favorite" on public.user_favorites;
create policy "users insert own favorite"
  on public.user_favorites for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users read own favorites" on public.user_favorites;
create policy "users read own favorites"
  on public.user_favorites for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users delete own favorite" on public.user_favorites;
create policy "users delete own favorite"
  on public.user_favorites for delete
  to authenticated
  using (user_id = auth.uid());
