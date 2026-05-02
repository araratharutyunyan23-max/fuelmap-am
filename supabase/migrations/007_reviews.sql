-- ============================================================================
-- FuelMap Armenia — Phase 7: station reviews
--
--  * station_reviews table (rating 1-5 + optional comment)
--  * one review per (user, station); user can edit/delete their own
--  * RLS: public can read, authenticated can write own, admins can delete any
--  * trigger keeps stations.rating (avg) and stations.reviews_count in sync
--    so the existing list/map UIs that read those columns work unchanged
-- Run via Management API or Dashboard SQL Editor.
-- ============================================================================

create table if not exists public.station_reviews (
  id          uuid primary key default gen_random_uuid(),
  station_id  text not null references public.stations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Denormalised display name; client reads `user_metadata.name` and writes it
  -- here so anyone can see "А. Артурян" without RLS access to auth.users.
  user_name   text,
  rating      smallint not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (station_id, user_id)
);

create index if not exists station_reviews_station_idx on public.station_reviews (station_id, created_at desc);
create index if not exists station_reviews_user_idx on public.station_reviews (user_id);

alter table public.station_reviews enable row level security;

drop policy if exists "reviews are public" on public.station_reviews;
create policy "reviews are public"
  on public.station_reviews for select
  using (true);

drop policy if exists "users insert own review" on public.station_reviews;
create policy "users insert own review"
  on public.station_reviews for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users update own review" on public.station_reviews;
create policy "users update own review"
  on public.station_reviews for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "users delete own or admin" on public.station_reviews;
create policy "users delete own or admin"
  on public.station_reviews for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- Keep the denormalised stations.rating + reviews_count fresh.
-- Recomputes for the affected station(s) after every change.
-- ----------------------------------------------------------------------------
create or replace function public.refresh_station_rating(target_station_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.stations s
  set
    rating = coalesce((select round(avg(rating)::numeric, 1) from public.station_reviews where station_id = target_station_id), 0),
    reviews_count = (select count(*) from public.station_reviews where station_id = target_station_id)
  where s.id = target_station_id;
$$;

create or replace function public.station_reviews_recalc()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.refresh_station_rating(old.station_id);
    return old;
  end if;
  perform public.refresh_station_rating(new.station_id);
  -- Cover the rare case of a station_id update.
  if (tg_op = 'UPDATE' and old.station_id is distinct from new.station_id) then
    perform public.refresh_station_rating(old.station_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_station_reviews_recalc on public.station_reviews;
create trigger trg_station_reviews_recalc
  after insert or update or delete on public.station_reviews
  for each row execute function public.station_reviews_recalc();

-- ----------------------------------------------------------------------------
-- Backfill: zero out the old random rating/reviews_count so brand-new accounts
-- see a clean slate. Real numbers will populate as users post reviews.
-- ----------------------------------------------------------------------------
update public.stations
set rating = 0, reviews_count = 0
where not exists (select 1 from public.station_reviews r where r.station_id = stations.id);
