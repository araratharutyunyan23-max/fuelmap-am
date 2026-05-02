-- ============================================================================
-- FuelMap Armenia — Phase 5: Telegram event notifications
-- Run in Supabase Dashboard → SQL Editor → New query → Run.
--
-- A DB trigger fires on every new row in price_reports and posts a message
-- to the admin Telegram channel via pg_net (no external service needed).
-- ============================================================================

create extension if not exists pg_net with schema extensions;

-- Private settings table — service-role only, no RLS exposure.
create schema if not exists private;
revoke all on schema private from public, authenticated, anon;

create table if not exists private.app_settings (
  key   text primary key,
  value text not null
);

revoke all on private.app_settings from public, authenticated, anon;

-- Token + chat id are inserted via the migration body so it can be re-applied
-- safely. Rotate by running an UPDATE here and re-running.
insert into private.app_settings (key, value) values
  ('telegram_bot_token', '8580618126:AAGfMYmCxzMvuIr0Zk2GZTBUR0fDet1z6is'),
  ('telegram_chat_id',   '-1003939513520')
on conflict (key) do update set value = excluded.value;

-- ============================================================================
-- Function: post a price-report event to Telegram.
-- security definer so it can read private.app_settings even when called
-- from a trigger fired by a less-privileged user.
-- ============================================================================
create or replace function public.notify_telegram_on_price_report()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  bot_token  text;
  chat_id    text;
  station_name text;
  user_email   text;
  message      text;
begin
  select value into bot_token from private.app_settings where key = 'telegram_bot_token';
  select value into chat_id   from private.app_settings where key = 'telegram_chat_id';
  if bot_token is null or chat_id is null then return new; end if;

  select s.name  into station_name from public.stations s where s.id = new.station_id;
  select u.email into user_email   from auth.users u    where u.id = new.user_id;

  message := format(
    E'🆕 Новый репорт цены\n\nАЗС: %s\nТопливо: %s\nЦена: %s ֏\nОт: %s\nСтатус: %s%s',
    coalesce(station_name, '?'),
    new.label,
    new.price,
    coalesce(user_email, '?'),
    new.status,
    case when new.photo_url is not null then E'\n📷 ' || new.photo_url else '' end
  );

  perform net.http_post(
    url     := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    body    := jsonb_build_object(
      'chat_id', chat_id,
      'text',    message,
      'disable_web_page_preview', false
    ),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_telegram_price_report on public.price_reports;
create trigger trg_notify_telegram_price_report
  after insert on public.price_reports
  for each row execute function public.notify_telegram_on_price_report();

-- ============================================================================
-- Function: post a status-change event when a report is moderated.
-- Fires only when status actually changed (avoid duplicate notifications
-- for non-status updates).
-- ============================================================================
create or replace function public.notify_telegram_on_report_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  bot_token text;
  chat_id   text;
  emoji     text;
  message   text;
begin
  if new.status is not distinct from old.status then return new; end if;

  select value into bot_token from private.app_settings where key = 'telegram_bot_token';
  select value into chat_id   from private.app_settings where key = 'telegram_chat_id';
  if bot_token is null or chat_id is null then return new; end if;

  emoji := case new.status when 'confirmed' then '✅' when 'rejected' then '❌' else 'ℹ️' end;
  message := format(
    E'%s Репорт #%s → %s\nЦена: %s ֏ за %s',
    emoji, new.id, new.status, new.price, new.label
  );

  perform net.http_post(
    url     := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    body    := jsonb_build_object('chat_id', chat_id, 'text', message),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_telegram_report_status on public.price_reports;
create trigger trg_notify_telegram_report_status
  after update of status on public.price_reports
  for each row execute function public.notify_telegram_on_report_status_change();
