-- ============================================================================
-- FuelMap Armenia — Phase 29: admin RPC for the engagement dashboard
--
-- Lists every user with last_sign_in_at + per-table action counts +
-- current balance + total earned, all in one call. Used by /admin/users
-- to surface who's actually using the app vs who just signed up and
-- never came back.
--
-- Returns nothing for non-admins (the WHERE clause short-circuits) so
-- non-admin authenticated calls don't leak the user list.
-- ============================================================================

create or replace function public.admin_user_engagement()
returns table (
  user_id              uuid,
  email                text,
  created_at           timestamptz,
  last_sign_in_at      timestamptz,
  balance_amd          integer,
  total_earned_amd     integer,
  price_reports        integer,
  station_submissions  integer,
  station_reviews      integer,
  favorites            integer,
  push_subscribed      boolean,
  is_seed              boolean
)
language sql
security definer
set search_path = public
as $$
  select
    u.id                                                                as user_id,
    u.email::text                                                       as email,
    u.created_at,
    u.last_sign_in_at,
    coalesce(b.amount_amd, 0)::int                                      as balance_amd,
    coalesce(b.total_earned_amd, 0)::int                                as total_earned_amd,
    (select count(*) from public.price_reports       pr where pr.user_id = u.id)::int,
    (select count(*) from public.station_submissions ss where ss.user_id = u.id)::int,
    (select count(*) from public.station_reviews     sr where sr.user_id = u.id)::int,
    (select count(*) from public.user_favorites      uf where uf.user_id = u.id)::int,
    exists(select 1 from public.push_subscriptions   ps where ps.user_id = u.id) as push_subscribed,
    coalesce((u.raw_user_meta_data->>'seed')::boolean, false)           as is_seed
  from auth.users u
  left join public.user_balance b on b.user_id = u.id
  where public.is_admin();
$$;

grant execute on function public.admin_user_engagement() to authenticated;
