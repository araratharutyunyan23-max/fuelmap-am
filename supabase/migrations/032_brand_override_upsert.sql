-- ============================================================================
-- FuelMap Armenia — Phase 32: brand override creates missing station rows
--
-- The previous trigger only UPDATEd existing (station_id, fuel_type) rows
-- in station_prices. If a brand had no scraped/seeded price for a given
-- fuel (e.g. Gulf had 95/lpg/diesel but never 92), saving an override in
-- /admin/brand-prices stored the override row but never materialised a
-- station_prices row — so the new value didn't show up in the user app
-- or the daily Story.
--
-- Switch to INSERT … ON CONFLICT DO UPDATE so missing combos are created
-- as part of the same path that updates existing ones. Then backfill all
-- currently-saved overrides so previously-applied-but-not-fanned-out
-- prices take effect immediately.
-- ============================================================================

create or replace function public.apply_brand_override()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  derived_price int;
  default_label text;
begin
  default_label := case new.fuel_type
                     when 'lpg'    then 'LPG'
                     when 'diesel' then 'Дизель'
                     else new.fuel_type
                   end;

  -- 1. Apply the override to every station of this brand. UPSERT so a
  --    brand missing a row for this fuel gets one created — the
  --    AFTER UPDATE OF price trigger on station_prices then recomputes
  --    trend + fans out push notifications as before.
  insert into public.station_prices (station_id, fuel_type, label, price, updated_at)
  select s.id, new.fuel_type, default_label, new.price, now()
    from public.stations s
   where s.brand = new.brand
  on conflict (station_id, fuel_type) do update
    set price      = excluded.price,
        updated_at = excluded.updated_at;

  -- 2. CPS derived rule: 92 = 95 − 20. If the override is on 95 and no
  --    explicit 92 override exists, also apply the derived 92.
  if new.brand = 'CPS' and new.fuel_type = '95' then
    if not exists (
      select 1 from public.brand_price_overrides
       where brand = 'CPS' and fuel_type = '92'
    ) then
      derived_price := new.price - 20;
      insert into public.station_prices (station_id, fuel_type, label, price, updated_at)
      select s.id, '92', '92', derived_price, now()
        from public.stations s
       where s.brand = 'CPS'
      on conflict (station_id, fuel_type) do update
        set price      = excluded.price,
            updated_at = excluded.updated_at;
    end if;
  end if;

  return new;
end;
$$;

-- One-shot backfill for overrides that were saved before this fix.
do $$
declare
  o record;
  default_label text;
  derived_price int;
begin
  for o in select * from public.brand_price_overrides loop
    default_label := case o.fuel_type
                       when 'lpg'    then 'LPG'
                       when 'diesel' then 'Дизель'
                       else o.fuel_type
                     end;

    insert into public.station_prices (station_id, fuel_type, label, price, updated_at)
    select s.id, o.fuel_type, default_label, o.price, now()
      from public.stations s
     where s.brand = o.brand
    on conflict (station_id, fuel_type) do update
      set price      = excluded.price,
          updated_at = excluded.updated_at;

    if o.brand = 'CPS' and o.fuel_type = '95' then
      if not exists (
        select 1 from public.brand_price_overrides
         where brand = 'CPS' and fuel_type = '92'
      ) then
        derived_price := o.price - 20;
        insert into public.station_prices (station_id, fuel_type, label, price, updated_at)
        select s.id, '92', '92', derived_price, now()
          from public.stations s
         where s.brand = 'CPS'
        on conflict (station_id, fuel_type) do update
          set price      = excluded.price,
              updated_at = excluded.updated_at;
      end if;
    end if;
  end loop;
end$$;
