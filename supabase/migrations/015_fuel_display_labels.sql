-- ============================================================================
-- FuelMap Armenia — Phase 15: human fuel labels in push notifications
--
-- The push body for price drops and price-report moderation used to read
-- "95 на Gulf: 550 → 540 ֏" — the bare octane number is confusing out of
-- context. Replace it with the same labels we surface in the UI:
-- "Regular", "Premium", "Super", "Diesel", "LPG", "CNG".
--
-- One small SQL helper keeps both triggers in sync; recreate the two
-- functions to use it.
-- ============================================================================

create or replace function public.fuel_display(fuel_type text)
returns text
language sql
immutable
as $$
  select case fuel_type
    when '92'     then 'Regular'
    when '95'     then 'Premium'
    when '98'     then 'Super'
    when 'diesel' then 'Diesel'
    when 'lpg'    then 'LPG'
    when 'cng'    then 'CNG'
    else fuel_type
  end;
$$;

create or replace function public.notify_favorites_on_price_drop()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  station_name text;
  delta        integer;
  fav_user     uuid;
  title        text;
  body         text;
begin
  if old.price is null or new.price is null then return new; end if;
  if new.price >= old.price then return new; end if;

  delta := old.price - new.price;
  select s.name into station_name from public.stations s where s.id = new.station_id;

  title := 'Цена упала';
  body  := format('%s на %s: %s → %s ֏ (↓%s)',
                  public.fuel_display(new.fuel_type),
                  coalesce(station_name, '?'),
                  old.price, new.price, delta);

  for fav_user in
    select user_id from public.user_favorites where station_id = new.station_id
  loop
    perform public.send_push_notification(fav_user, title, body, '/');
  end loop;

  return new;
end;
$$;

create or replace function public.push_user_on_price_report_status()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  station_name text;
  title        text;
  body         text;
begin
  if old.status = new.status then return new; end if;
  if new.status not in ('confirmed', 'rejected') then return new; end if;

  select s.name into station_name from public.stations s where s.id = new.station_id;

  if new.status = 'confirmed' then
    title := 'Цена подтверждена';
    body := format('%s ֏ за %s на %s — теперь видно всем',
                   new.price, public.fuel_display(new.fuel_type),
                   coalesce(station_name, 'станции'));
  else
    title := 'Цена не прошла модерацию';
    body := format('%s ֏ за %s на %s. Попробуйте отправить ещё раз.',
                   new.price, public.fuel_display(new.fuel_type),
                   coalesce(station_name, 'станции'));
  end if;

  perform public.send_push_notification(new.user_id, title, body, '/');
  return new;
end;
$$;
