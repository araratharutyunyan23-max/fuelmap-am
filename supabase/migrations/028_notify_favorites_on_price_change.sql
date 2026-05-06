-- ============================================================================
-- FuelMap Armenia — Phase 28: notify favorited-station fans on price RISES
--
-- Until now notify_favorites_on_price_drop() bailed early when the new
-- price wasn't lower than the old one — fans only saw "цена упала"
-- pushes. A rise is just as actionable (people decide to fill up
-- *before* a hike), so the trigger now fires on both directions and
-- the title/body match the direction of the change.
--
-- Renames function and trigger to *_on_price_change for honesty.
-- The old trigger is dropped explicitly so the table stops calling
-- the deprecated handler.
-- ============================================================================

drop trigger if exists trg_notify_favorites_on_price_drop on public.station_prices;
drop function if exists public.notify_favorites_on_price_drop();

create or replace function public.notify_favorites_on_price_change()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  station_name text;
  delta        integer;
  fav_user     uuid;
  loc          text;
  title        text;
  body         text;
  rising       boolean;
begin
  if old.price is null or new.price is null then return new; end if;
  if new.price = old.price then return new; end if;

  rising := new.price > old.price;
  delta  := abs(new.price - old.price);

  select s.name into station_name from public.stations s where s.id = new.station_id;

  for fav_user in
    select user_id from public.user_favorites where station_id = new.station_id
  loop
    loc := public.user_locale(fav_user);
    if rising then
      if loc = 'hy' then
        title := 'Գինը բարձրացել է';
        body  := format('%s %s-ում: %s → %s ֏ (↑%s)',
                        public.fuel_display(new.fuel_type),
                        coalesce(station_name, '?'),
                        old.price, new.price, delta);
      else
        title := 'Цена выросла';
        body  := format('%s на %s: %s → %s ֏ (↑%s)',
                        public.fuel_display(new.fuel_type),
                        coalesce(station_name, '?'),
                        old.price, new.price, delta);
      end if;
    else
      if loc = 'hy' then
        title := 'Գինն իջել է';
        body  := format('%s %s-ում: %s → %s ֏ (↓%s)',
                        public.fuel_display(new.fuel_type),
                        coalesce(station_name, '?'),
                        old.price, new.price, delta);
      else
        title := 'Цена упала';
        body  := format('%s на %s: %s → %s ֏ (↓%s)',
                        public.fuel_display(new.fuel_type),
                        coalesce(station_name, '?'),
                        old.price, new.price, delta);
      end if;
    end if;

    perform public.send_push_notification(fav_user, title, body, '/');
  end loop;

  return new;
end;
$$;

create trigger trg_notify_favorites_on_price_change
  after update of price on public.station_prices
  for each row execute function public.notify_favorites_on_price_change();
