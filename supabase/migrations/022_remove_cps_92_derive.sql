-- ============================================================================
-- FuelMap Armenia — Phase 22: drop the implicit CPS 92 = 95 − 20 rule
--
-- Decision 2026-05-05: explicit overrides only. If the admin wants CPS
-- 92 to be 500, they enter 500 in the grid. No more silent
-- recomputation that left the displayed 92 lagging the admin's intent.
-- ============================================================================

create or replace function public.apply_brand_override()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Propagate the override straight to every station of this brand for
  -- the given fuel. The existing AFTER UPDATE OF price trigger on
  -- station_prices recomputes trend + fans out push notifications.
  update public.station_prices sp
     set price      = new.price,
         updated_at = now()
    from public.stations s
   where sp.station_id = s.id
     and s.brand       = new.brand
     and sp.fuel_type  = new.fuel_type;

  return new;
end;
$$;
