-- ============================================================================
-- FuelMap Armenia — initial schema
-- Run this in Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================

-- Stations: static data sourced from OpenStreetMap.
create table if not exists public.stations (
  id            text primary key,
  name          text not null,
  brand         text not null,
  brand_color   text not null,
  address       text,
  lat           double precision not null,
  lng           double precision not null,
  rating        numeric(2,1),
  reviews_count integer default 0,
  hours         jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists stations_brand_idx       on public.stations (brand);
create index if not exists stations_lat_lng_idx     on public.stations (lat, lng);

-- Current prices per station per fuel type. One row per (station, fuel).
create table if not exists public.station_prices (
  station_id   text not null references public.stations(id) on delete cascade,
  fuel_type    text not null,
  label        text not null,
  price        integer not null,
  trend        integer default 0,
  updated_at   timestamptz default now(),
  primary key (station_id, fuel_type)
);

create index if not exists station_prices_fuel_idx on public.station_prices (fuel_type);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.stations       enable row level security;
alter table public.station_prices enable row level security;

-- Anyone (anon + authenticated) can READ stations and prices.
create policy "stations are public"
  on public.stations for select
  to anon, authenticated
  using (true);

create policy "prices are public"
  on public.station_prices for select
  to anon, authenticated
  using (true);

-- Writes happen only via the seed script using the service_role key
-- (which bypasses RLS), so no INSERT/UPDATE policies needed yet.
-- When we add user-submitted prices later, we'll add a separate
-- price_reports table with policies tied to auth.uid().
