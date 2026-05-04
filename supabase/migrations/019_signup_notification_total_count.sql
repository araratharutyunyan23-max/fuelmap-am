-- ============================================================================
-- FuelMap Armenia — Phase 19: include total user count in signup alert
--
-- The previous Telegram message just said "🆕 Новая регистрация" with name
-- + email. Append a "Всего: N пользователей" line so we can watch the
-- counter climb in real time without opening the dashboard.
-- ============================================================================

create or replace function public.notify_telegram_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  bot_token   text;
  chat_id     text;
  user_name   text;
  total_users int;
  message     text;
begin
  select value into bot_token from private.app_settings where key = 'telegram_bot_token';
  select value into chat_id   from private.app_settings where key = 'telegram_chat_id';
  if bot_token is null or chat_id is null then return new; end if;

  user_name := coalesce(new.raw_user_meta_data->>'name', '—');
  -- include the row we just inserted (the trigger fires AFTER insert,
  -- so it's already counted).
  select count(*) into total_users from auth.users;

  message := format(
    E'🆕 Новая регистрация\n\nИмя: %s\nEmail: %s\n\nВсего: %s пользователей',
    user_name,
    coalesce(new.email, '?'),
    total_users
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
