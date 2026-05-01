-- ============================================================================
-- FuelMap Armenia — Phase 2: crowdsourced price reports + auth-aware policies
-- Run in Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================

-- User-submitted price reports. One row per submission (history is preserved).
create table if not exists public.price_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  station_id  text not null references public.stations(id) on delete cascade,
  fuel_type   text not null,
  label       text not null,
  price       integer not null check (price > 0 and price < 100000),
  photo_url   text,
  status      text not null default 'pending'
              check (status in ('pending', 'confirmed', 'rejected')),
  created_at  timestamptz not null default now()
);

create index if not exists price_reports_station_fuel_idx
  on public.price_reports (station_id, fuel_type, created_at desc);
create index if not exists price_reports_user_idx
  on public.price_reports (user_id, created_at desc);
create index if not exists price_reports_status_idx
  on public.price_reports (status);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.price_reports enable row level security;

-- Anyone can read confirmed reports (e.g., to show recent submissions).
create policy "confirmed reports are public"
  on public.price_reports for select
  to anon, authenticated
  using (status = 'confirmed');

-- Users can read their own submissions regardless of status.
create policy "users read own reports"
  on public.price_reports for select
  to authenticated
  using (auth.uid() = user_id);

-- Authenticated users can insert reports only for themselves.
create policy "users insert own reports"
  on public.price_reports for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ============================================================================
-- Trigger: when a report is marked 'confirmed', update station_prices
-- to reflect the new value. Old prices remain in price_reports as history.
-- ============================================================================

create or replace function public.apply_confirmed_price_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed'
     and (old.status is distinct from 'confirmed') then
    insert into public.station_prices (station_id, fuel_type, label, price, trend, updated_at)
    values (new.station_id, new.fuel_type, new.label, new.price, 0, now())
    on conflict (station_id, fuel_type)
    do update set
      price      = excluded.price,
      label      = excluded.label,
      trend      = case
                     when station_prices.price < excluded.price then 1
                     when station_prices.price > excluded.price then -1
                     else 0
                   end,
      updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_apply_confirmed_price_report on public.price_reports;
create trigger trg_apply_confirmed_price_report
  after insert or update of status on public.price_reports
  for each row execute function public.apply_confirmed_price_report();
