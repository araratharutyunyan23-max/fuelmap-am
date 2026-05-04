-- ============================================================================
-- FuelMap Armenia — Phase 14: push to favorited-station fans on price drops
--
-- When the daily scraper updates a station_prices row and the price went
-- DOWN, fan out a push to every user who favorited that station. We
-- skip price increases on purpose — drivers care about saving, an "up
-- 5 ֏" notification is just noise that turns the toggle off.
-- ============================================================================

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
  fuel_label   text;
  title        text;
  body         text;
begin
  -- Only fire on actual decreases. Insert (no OLD) is skipped.
  if old.price is null or new.price is null then return new; end if;
  if new.price >= old.price then return new; end if;

  delta := old.price - new.price;
  fuel_label := coalesce(new.label, new.fuel_type);
  select s.name into station_name from public.stations s where s.id = new.station_id;

  title := 'Цена упала';
  body  := format('%s на %s: %s → %s ֏ (↓%s)',
                  fuel_label,
                  coalesce(station_name, '?'),
                  old.price, new.price, delta);

  -- One push per favorite. send_push_notification is a no-op when
  -- push_send_secret / app_url are missing, so this trigger is safe to
  -- ship before either is configured.
  for fav_user in
    select user_id from public.user_favorites where station_id = new.station_id
  loop
    perform public.send_push_notification(
      fav_user,
      title,
      body,
      '/'
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notify_favorites_on_price_drop on public.station_prices;
create trigger trg_notify_favorites_on_price_drop
  after update of price on public.station_prices
  for each row execute function public.notify_favorites_on_price_drop();
