-- ============================================================================
-- FuelMap Armenia — Phase 17: rate limiting on user-generated submits
--
-- Hard caps on how many rows a single user can insert into the three
-- crowdsource tables in a sliding minute / hour / day window. Real
-- humans fill up once a day and submit a handful of prices/reviews,
-- so these ceilings only bite if someone is actually trying to spam.
--
-- Tables protected:
--   * price_reports       — 5/min · 30/h · 100/day
--   * station_submissions — 1/min · 10/h · 30/day  (heavier per row)
--   * station_reviews     — 5/min · 20/h · 100/day
--
-- The error returned uses SQLSTATE P0001 with a "rate_limit:" prefix in
-- the message; the frontend pattern-matches that to surface a friendly
-- "слишком часто" toast.
-- ============================================================================

create or replace function public.assert_rate_limit(
  p_table          text,
  p_user_id        uuid,
  p_window_seconds int,
  p_max_count      int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cnt int;
begin
  if p_user_id is null then return; end if;
  -- Identifier-quoted to avoid SQL injection on the table name (callers
  -- pass a literal, but the format() expansion makes that explicit).
  execute format(
    'select count(*) from public.%I where user_id = $1 and created_at > now() - make_interval(secs => $2)',
    p_table
  ) into cnt using p_user_id, p_window_seconds;

  if cnt >= p_max_count then
    raise exception 'rate_limit: max % per %s exceeded', p_max_count, p_window_seconds
      using errcode = 'P0001';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- price_reports — 5/min, 30/h, 100/day
-- ----------------------------------------------------------------------------
create or replace function public.rl_price_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_rate_limit('price_reports', new.user_id, 60,    5);
  perform public.assert_rate_limit('price_reports', new.user_id, 3600,  30);
  perform public.assert_rate_limit('price_reports', new.user_id, 86400, 100);
  return new;
end;
$$;

drop trigger if exists trg_rl_price_reports on public.price_reports;
create trigger trg_rl_price_reports
  before insert on public.price_reports
  for each row execute function public.rl_price_reports();

-- ----------------------------------------------------------------------------
-- station_submissions — 1/min, 10/h, 30/day  (lower because each row is
-- heavier; pattern is "I see one missing station, I submit one")
-- ----------------------------------------------------------------------------
create or replace function public.rl_station_submissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_rate_limit('station_submissions', new.user_id, 60,    1);
  perform public.assert_rate_limit('station_submissions', new.user_id, 3600,  10);
  perform public.assert_rate_limit('station_submissions', new.user_id, 86400, 30);
  return new;
end;
$$;

drop trigger if exists trg_rl_station_submissions on public.station_submissions;
create trigger trg_rl_station_submissions
  before insert on public.station_submissions
  for each row execute function public.rl_station_submissions();

-- ----------------------------------------------------------------------------
-- station_reviews — 5/min, 20/h, 100/day. Same shape as price_reports
-- because a review-as-edit is also an insert (we upsert by user/station).
-- ----------------------------------------------------------------------------
create or replace function public.rl_station_reviews()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_rate_limit('station_reviews', new.user_id, 60,    5);
  perform public.assert_rate_limit('station_reviews', new.user_id, 3600,  20);
  perform public.assert_rate_limit('station_reviews', new.user_id, 86400, 100);
  return new;
end;
$$;

drop trigger if exists trg_rl_station_reviews on public.station_reviews;
create trigger trg_rl_station_reviews
  before insert on public.station_reviews
  for each row execute function public.rl_station_reviews();

-- ----------------------------------------------------------------------------
-- Composite indexes so the (user_id, created_at) range scans behind the
-- rate-limit checks stay O(log N) as the tables grow. price_reports
-- already has its own indexes; we just make sure the (user, time) shape
-- exists for all three.
-- ----------------------------------------------------------------------------
create index if not exists price_reports_user_created_idx
  on public.price_reports (user_id, created_at desc);
create index if not exists station_submissions_user_created_idx
  on public.station_submissions (user_id, created_at desc);
create index if not exists station_reviews_user_created_idx
  on public.station_reviews (user_id, created_at desc);
