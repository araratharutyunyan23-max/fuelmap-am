-- ============================================================================
-- FuelMap Armenia — Phase 8: Telegram alert on new user signup
--
-- Mirrors the price-report notification (005 + 006) but fires on auth.users
-- INSERT. Uses the same telegram_bot_token / telegram_chat_id rows in
-- private.app_settings, so no extra config is needed.
-- Run via Management API or Dashboard SQL Editor.
-- ============================================================================

create or replace function public.notify_telegram_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  bot_token  text;
  chat_id    text;
  user_name  text;
  message    text;
begin
  select value into bot_token from private.app_settings where key = 'telegram_bot_token';
  select value into chat_id   from private.app_settings where key = 'telegram_chat_id';
  if bot_token is null or chat_id is null then return new; end if;

  -- name lives in raw_user_meta_data when set via signUp({ options: { data: { name } } })
  user_name := coalesce(new.raw_user_meta_data->>'name', '—');

  message := format(
    E'🆕 Новая регистрация\n\nИмя: %s\nEmail: %s',
    user_name,
    coalesce(new.email, '?')
  );

  perform net.http_post(
    url     := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    body    := jsonb_build_object(
      'chat_id', chat_id,
      'text',    message,
      'disable_web_page_preview', true
    ),
    headers := '{"Content-Type":"application/json"}'::jsonb
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_telegram_on_signup on auth.users;
create trigger trg_notify_telegram_on_signup
  after insert on auth.users
  for each row execute function public.notify_telegram_on_signup();
