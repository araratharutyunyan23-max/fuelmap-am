-- ============================================================================
-- FuelMap Armenia — Phase 24: collect prices when a user submits a new AZS
--
-- The submit-station form now asks for Regular / Premium / LPG (required)
-- and Diesel (optional). Storing those next to the location means the
-- single "Подтвердить" click in the admin can create the station AND the
-- price rows in one pass — no second round-trip through price_reports.
-- ============================================================================

alter table public.station_submissions
  add column if not exists price_92     integer check (price_92     is null or (price_92     > 0 and price_92     < 10000)),
  add column if not exists price_95     integer check (price_95     is null or (price_95     > 0 and price_95     < 10000)),
  add column if not exists price_98     integer check (price_98     is null or (price_98     > 0 and price_98     < 10000)),
  add column if not exists price_diesel integer check (price_diesel is null or (price_diesel > 0 and price_diesel < 10000)),
  add column if not exists price_lpg    integer check (price_lpg    is null or (price_lpg    > 0 and price_lpg    < 10000));

-- ----------------------------------------------------------------------------
-- Recreate the on-confirm trigger so it ALSO seeds station_prices from the
-- prices the user submitted. Mirrors the existing 011 logic for the
-- station insert; only the prices block is new.
-- ----------------------------------------------------------------------------
create or replace function public.create_station_on_submission_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id         text;
  resolved_color text;
  fuel_label     text;
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    if new.created_station_id is not null then return new; end if;

    new_id := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);

    select brand_color into resolved_color
      from public.stations where brand = new.brand limit 1;
    if resolved_color is null then resolved_color := '#64748b'; end if;

    insert into public.stations
      (id, name, brand, brand_color, address, address_hy, lat, lng, rating, reviews_count)
    values
      (new_id,
       coalesce(new.name, new.brand),
       new.brand,
       resolved_color,
       new.address,
       null,
       new.lat,
       new.lng,
       0,
       0)
    on conflict (id) do nothing;

    -- Seed station_prices from whatever the user filled in.
    if new.price_92 is not null then
      insert into public.station_prices (station_id, fuel_type, label, price, updated_at)
      values (new_id, '92', '92', new.price_92, now())
      on conflict (station_id, fuel_type) do update set price = excluded.price, updated_at = now();
    end if;
    if new.price_95 is not null then
      insert into public.station_prices (station_id, fuel_type, label, price, updated_at)
      values (new_id, '95', '95', new.price_95, now())
      on conflict (station_id, fuel_type) do update set price = excluded.price, updated_at = now();
    end if;
    if new.price_98 is not null then
      insert into public.station_prices (station_id, fuel_type, label, price, updated_at)
      values (new_id, '98', '98', new.price_98, now())
      on conflict (station_id, fuel_type) do update set price = excluded.price, updated_at = now();
    end if;
    if new.price_diesel is not null then
      insert into public.station_prices (station_id, fuel_type, label, price, updated_at)
      values (new_id, 'diesel', 'Дизель', new.price_diesel, now())
      on conflict (station_id, fuel_type) do update set price = excluded.price, updated_at = now();
    end if;
    if new.price_lpg is not null then
      insert into public.station_prices (station_id, fuel_type, label, price, updated_at)
      values (new_id, 'lpg', 'LPG', new.price_lpg, now())
      on conflict (station_id, fuel_type) do update set price = excluded.price, updated_at = now();
    end if;

    new.created_station_id := new_id;
    new.reviewed_at := now();
    return new;
  end if;

  if new.status = 'rejected' and old.status is distinct from 'rejected' then
    new.reviewed_at := now();
  end if;

  return new;
end;
$$;
