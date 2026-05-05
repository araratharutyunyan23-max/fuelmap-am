-- ============================================================================
-- FuelMap Armenia — Phase 20: per-brand manual price overrides
--
-- Reality check: GPP gives us a country-wide average ("95 in Armenia is
-- 550 ֏"), but real CPS / RAN Oil / Gulf prices drift 15-30 ֏ from that
-- mean. Until each brand publishes a feed we can scrape, the cheapest
-- truthful path is letting the admin enter the right number for each
-- (brand, fuel) pair from the dashboard.
--
-- The scraper will read this table FIRST and only fall back to the GPP
-- average / Flash / Max Oil scraper output when no override exists.
-- ============================================================================

create table if not exists public.brand_price_overrides (
  brand       text not null,
  fuel_type   text not null,
  price       integer not null check (price > 0 and price < 10000),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null,
  primary key (brand, fuel_type)
);

alter table public.brand_price_overrides enable row level security;

drop policy if exists "overrides public read" on public.brand_price_overrides;
create policy "overrides public read"
  on public.brand_price_overrides for select
  using (true);

drop policy if exists "admins manage overrides" on public.brand_price_overrides;
create policy "admins manage overrides"
  on public.brand_price_overrides for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin dashboard needs the total user count, but auth.users isn't
-- exposed through PostgREST. A security-definer wrapper limited to
-- admins keeps the surface tight.
create or replace function public.user_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select case
    when public.is_admin() then (select count(*)::int from auth.users)
    else 0
  end;
$$;
grant execute on function public.user_count() to authenticated;
