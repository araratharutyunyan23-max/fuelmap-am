-- ============================================================================
-- FuelMap Armenia — Phase 6: admin moderation
--
--  * allow-list of admin user ids (private.admin_users)
--  * is_admin() helper used in RLS
--  * RLS policies so admins can read/update any price_report
--  * app_url setting so the Telegram trigger can attach a deep link
--  * notify_telegram_on_price_report() now includes that deep link
-- Run in Supabase Dashboard → SQL Editor → New query → Run.
-- ============================================================================

create table if not exists private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
revoke all on private.admin_users from public, authenticated, anon;

-- Seed admin: the project owner. Idempotent.
insert into private.admin_users (user_id)
select id from auth.users where email = 'araratharutyunyan23@gmail.com'
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Helper visible to RLS: is the *current* authenticated user an admin?
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (select 1 from private.admin_users where user_id = auth.uid())
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- ----------------------------------------------------------------------------
-- RLS — admins can read any report (any status) and change status.
-- Users still keep their existing policies (insert own / read own /
-- confirmed reports are public).
-- ----------------------------------------------------------------------------

drop policy if exists "admins read all reports"  on public.price_reports;
create policy "admins read all reports"
  on public.price_reports for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins update reports" on public.price_reports;
create policy "admins update reports"
  on public.price_reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- App URL for Telegram deep links. Update when you deploy to Vercel.
-- ----------------------------------------------------------------------------
insert into private.app_settings (key, value) values
  ('app_url', 'https://promise-garage-settle-eventually.trycloudflare.com')
on conflict (key) do update set value = excluded.value;

-- ----------------------------------------------------------------------------
-- Telegram notification on new report — now includes a deep link.
-- ----------------------------------------------------------------------------
create or replace function public.notify_telegram_on_price_report()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  bot_token    text;
  chat_id      text;
  app_url      text;
  station_name text;
  user_email   text;
  message      text;
begin
  select value into bot_token from private.app_settings where key = 'telegram_bot_token';
  select value into chat_id   from private.app_settings where key = 'telegram_chat_id';
  select value into app_url   from private.app_settings where key = 'app_url';
  if bot_token is null or chat_id is null then return new; end if;

  select s.name  into station_name from public.stations s where s.id = new.station_id;
  select u.email into user_email   from auth.users u    where u.id = new.user_id;

  message := format(
    E'🆕 Новый репорт цены\n\nАЗС: %s\nТопливо: %s\nЦена: %s ֏\nОт: %s%s%s',
    coalesce(station_name, '?'),
    new.label,
    new.price,
    coalesce(user_email, '?'),
    case when new.photo_url is not null then E'\n📷 ' || new.photo_url else '' end,
    case when app_url is not null then E'\n\n👉 Открыть в админке: ' || app_url || '/?admin=' || new.id::text else '' end
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
