-- ============================================================================
-- FuelMap Armenia — Phase 10: notify the submitter when admin moderates
-- their price_reports row.
--
-- Fires AFTER UPDATE on price_reports when status flips from 'pending' to
-- 'confirmed' or 'rejected'. Reads the user's email from auth.users and
-- POSTs to Resend's transactional API (separate from the Supabase Auth
-- SMTP path, which is locked to the auth flows).
--
-- Setup: paste a Resend API key with "Sending access" + domain
-- fuelmap.app into the resend_api_key row of private.app_settings BEFORE
-- this trigger does anything useful. Otherwise the function silently
-- returns and emails are skipped.
-- ============================================================================

insert into private.app_settings (key, value) values ('resend_api_key', '')
on conflict (key) do nothing;

create or replace function public.notify_user_on_price_report_status()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  api_key      text;
  user_email   text;
  station_name text;
  subject      text;
  body         text;
begin
  -- Only fire on transitions out of 'pending' to a terminal status.
  if old.status = new.status then return new; end if;
  if new.status not in ('confirmed', 'rejected') then return new; end if;

  select value into api_key from private.app_settings where key = 'resend_api_key';
  if api_key is null or api_key = '' then return new; end if;

  select u.email into user_email from auth.users u where u.id = new.user_id;
  if user_email is null then return new; end if;

  select s.name into station_name from public.stations s where s.id = new.station_id;

  if new.status = 'confirmed' then
    subject := 'Ваша цена подтверждена · FuelMap Armenia';
    body := format(
      E'Спасибо! Цена %s ֏ за %s на станции «%s» подтверждена и теперь видна другим водителям.\n\nFuelMap Armenia\nhttps://fuelmap.app',
      new.price, new.label, coalesce(station_name, '?')
    );
  else
    subject := 'Цена не прошла модерацию · FuelMap Armenia';
    body := format(
      E'Цена %s ֏ за %s на станции «%s» не прошла модерацию.\n\nВозможно, фото было нечётким или цифра не совпадала с табло. Попробуйте отправить ещё раз — мы будем рады.\n\nFuelMap Armenia\nhttps://fuelmap.app',
      new.price, new.label, coalesce(station_name, '?')
    );
  end if;

  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    body    := jsonb_build_object(
      'from',    'FuelMap Armenia <noreply@fuelmap.app>',
      'to',      user_email,
      'subject', subject,
      'text',    body
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || api_key
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_user_on_price_report_status on public.price_reports;
create trigger trg_notify_user_on_price_report_status
  after update of status on public.price_reports
  for each row execute function public.notify_user_on_price_report_status();
