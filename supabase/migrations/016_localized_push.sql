-- ============================================================================
-- FuelMap Armenia — Phase 16: localized push notifications (RU + HY)
--
-- Push body used to be hard-coded Russian. Read each user's chosen locale
-- from their auth metadata (the frontend writes it via supabase.auth
-- .updateUser({ data: { locale } }) on language switch) and pick a body
-- in that language. Default to 'ru' when nothing is set, since that's
-- the app's default locale.
--
-- Touched triggers:
--   * notify_favorites_on_price_drop()
--   * push_user_on_price_report_status()
--   * push_user_on_station_submission_status()
-- ============================================================================

create or replace function public.user_locale(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (raw_user_meta_data->>'locale'),
    'ru'
  )
  from auth.users
  where id = target_user_id;
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
  loc          text;
  title        text;
  body         text;
begin
  if old.price is null or new.price is null then return new; end if;
  if new.price >= old.price then return new; end if;

  delta := old.price - new.price;
  select s.name into station_name from public.stations s where s.id = new.station_id;

  for fav_user in
    select user_id from public.user_favorites where station_id = new.station_id
  loop
    loc := public.user_locale(fav_user);
    if loc = 'hy' then
      title := 'Գինն իջել է';
      body := format('%s %s-ում: %s → %s ֏ (↓%s)',
                     public.fuel_display(new.fuel_type),
                     coalesce(station_name, '?'),
                     old.price, new.price, delta);
    else
      title := 'Цена упала';
      body := format('%s на %s: %s → %s ֏ (↓%s)',
                     public.fuel_display(new.fuel_type),
                     coalesce(station_name, '?'),
                     old.price, new.price, delta);
    end if;

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
  loc          text;
  title        text;
  body         text;
begin
  if old.status = new.status then return new; end if;
  if new.status not in ('confirmed', 'rejected') then return new; end if;

  select s.name into station_name from public.stations s where s.id = new.station_id;
  loc := public.user_locale(new.user_id);

  if new.status = 'confirmed' then
    if loc = 'hy' then
      title := 'Գինը հաստատվել է';
      body := format('%s ֏ %s-ի համար %s-ում — այժմ տեսանելի է բոլորին',
                     new.price, public.fuel_display(new.fuel_type),
                     coalesce(station_name, 'կայանի'));
    else
      title := 'Цена подтверждена';
      body := format('%s ֏ за %s на %s — теперь видно всем',
                     new.price, public.fuel_display(new.fuel_type),
                     coalesce(station_name, 'станции'));
    end if;
  else
    if loc = 'hy' then
      title := 'Գինը չի հաստատվել';
      body := format('%s ֏ %s-ի համար %s-ում չի հաստատվել։ Փորձիր նորից ուղարկել։',
                     new.price, public.fuel_display(new.fuel_type),
                     coalesce(station_name, 'կայանի'));
    else
      title := 'Цена не прошла модерацию';
      body := format('%s ֏ за %s на %s. Попробуйте отправить ещё раз.',
                     new.price, public.fuel_display(new.fuel_type),
                     coalesce(station_name, 'станции'));
    end if;
  end if;

  perform public.send_push_notification(new.user_id, title, body, '/');
  return new;
end;
$$;

create or replace function public.push_user_on_station_submission_status()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  loc   text;
  title text;
  body  text;
begin
  if old.status = new.status then return new; end if;
  if new.status not in ('confirmed', 'rejected') then return new; end if;

  loc := public.user_locale(new.user_id);

  if new.status = 'confirmed' then
    if loc = 'hy' then
      title := 'Բենզակայանն ավելացված է';
      body := format('%s (%s) այժմ քարտեզի վրա է — շնորհակալություն!',
                     coalesce(new.name, new.brand), new.brand);
    else
      title := 'АЗС добавлена';
      body := format('%s (%s) теперь на карте — спасибо!',
                     coalesce(new.name, new.brand), new.brand);
    end if;
  else
    if loc = 'hy' then
      title := 'ԲԿ-ի հայտը չի հաստատվել';
      body := format('%s (%s) չի հաստատվել։',
                     coalesce(new.name, new.brand), new.brand);
    else
      title := 'Заявка на АЗС не подтверждена';
      body := format('%s (%s) не прошла модерацию.',
                     coalesce(new.name, new.brand), new.brand);
    end if;
  end if;

  perform public.send_push_notification(new.user_id, title, body, '/');
  return new;
end;
$$;
