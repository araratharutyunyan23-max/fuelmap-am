-- ============================================================================
-- FuelMap Armenia — Phase 21: apply brand price overrides immediately
--
-- Until now, an admin could save a new price in /admin/brand-prices but
-- the change wouldn't show up in the user app until the next scrape run
-- (next morning). The trigger below propagates the override to
-- station_prices for every station of that brand on save, so the user
-- app updates the next time it queries — and the existing
-- notify_favorites_on_price_drop / push_user triggers fire as a side
-- effect, fanning out push notifications to people who favorited any of
-- those stations.
--
-- CPS-only special case: the scraper derives 92 = 95 − 20 in JS. Mirror
-- that here so an override on CPS/95 also updates CPS/92 immediately.
-- An explicit 92 override (if the admin set one separately) wins.
-- ============================================================================

create or replace function public.apply_brand_override()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  derived_price int;
begin
  -- 1. Propagate the override to every station of this brand for the
  --    given fuel. The existing AFTER UPDATE OF price trigger on
  --    station_prices recomputes trend + fans out push notifications.
  update public.station_prices sp
     set price      = new.price,
         updated_at = now()
    from public.stations s
   where sp.station_id = s.id
     and s.brand       = new.brand
     and sp.fuel_type  = new.fuel_type;

  -- 2. CPS derived rule: 92 = 95 − 20. If the override is on 95 and no
  --    explicit 92 override exists, also apply the derived 92.
  if new.brand = 'CPS' and new.fuel_type = '95' then
    if not exists (
      select 1 from public.brand_price_overrides
       where brand = 'CPS' and fuel_type = '92'
    ) then
      derived_price := new.price - 20;
      update public.station_prices sp
         set price      = derived_price,
             updated_at = now()
        from public.stations s
       where sp.station_id = s.id
         and s.brand       = 'CPS'
         and sp.fuel_type  = '92';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_brand_override on public.brand_price_overrides;
create trigger trg_apply_brand_override
  after insert or update on public.brand_price_overrides
  for each row execute function public.apply_brand_override();
