-- ============================================================================
-- FuelMap Armenia — Phase 12: Web Push notifications
--
-- Stores per-device Web Push subscriptions and lets DB triggers fan out
-- notifications by POSTing to /api/push/send (a Vercel route that holds
-- the VAPID private key and signs the actual push messages). The shared
-- bearer between Postgres and the route lives in private.app_settings
-- (key 'push_send_secret') and on the Vercel side as PUSH_SEND_SECRET.
-- ============================================================================

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "users insert own subscription" on public.push_subscriptions;
create policy "users insert own subscription"
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "users read own subscriptions" on public.push_subscriptions;
create policy "users read own subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users delete own subscriptions" on public.push_subscriptions;
create policy "users delete own subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

-- Settings rows the triggers below need. Both ship empty so the migration
-- is safe to apply before the secrets are in place.
insert into private.app_settings (key, value) values ('push_send_secret', '')
on conflict (key) do nothing;

-- Vercel deployment URL is reused from the existing app_url row that 006
-- (admin) seeded — we don't need a separate setting.

-- ----------------------------------------------------------------------------
-- Helper: POST to /api/push/send when an event should reach a user.
-- Silently no-ops if push_send_secret or app_url are missing — that lets us
-- deploy the migration before the env vars are in Vercel without breakage.
-- ----------------------------------------------------------------------------
create or replace function public.send_push_notification(
  target_user_id uuid,
  title          text,
  body           text,
  url            text default null
)
returns void
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  secret  text;
  app_url text;
begin
  select value into secret  from private.app_settings where key = 'push_send_secret';
  select value into app_url from private.app_settings where key = 'app_url';
  if secret  is null or secret  = '' then return; end if;
  if app_url is null or app_url = '' then return; end if;

  perform net.http_post(
    url     := app_url || '/api/push/send',
    body    := jsonb_build_object(
      'user_id', target_user_id,
      'title',   title,
      'body',    body,
      'url',     url
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || secret
    )
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- Push on price_reports moderation. Fires alongside the existing email
-- trigger from migration 010 — push for the same status flips.
-- ----------------------------------------------------------------------------
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
                   new.price, new.label, coalesce(station_name, 'станции'));
  else
    title := 'Цена не прошла модерацию';
    body := format('%s ֏ за %s на %s. Попробуйте отправить ещё раз.',
                   new.price, new.label, coalesce(station_name, 'станции'));
  end if;

  perform public.send_push_notification(new.user_id, title, body, '/');
  return new;
end;
$$;

drop trigger if exists trg_push_user_on_price_report_status on public.price_reports;
create trigger trg_push_user_on_price_report_status
  after update of status on public.price_reports
  for each row execute function public.push_user_on_price_report_status();

-- ----------------------------------------------------------------------------
-- Push on station_submissions moderation. Mirrors the price-report variant.
-- ----------------------------------------------------------------------------
create or replace function public.push_user_on_station_submission_status()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  title text;
  body  text;
begin
  if old.status = new.status then return new; end if;
  if new.status not in ('confirmed', 'rejected') then return new; end if;

  if new.status = 'confirmed' then
    title := 'АЗС добавлена';
    body := format('%s (%s) теперь на карте — спасибо!',
                   coalesce(new.name, new.brand), new.brand);
  else
    title := 'Заявка на АЗС не подтверждена';
    body := format('%s (%s) не прошла модерацию.',
                   coalesce(new.name, new.brand), new.brand);
  end if;

  perform public.send_push_notification(new.user_id, title, body, '/');
  return new;
end;
$$;

drop trigger if exists trg_push_user_on_station_submission_status on public.station_submissions;
create trigger trg_push_user_on_station_submission_status
  after update of status on public.station_submissions
  for each row execute function public.push_user_on_station_submission_status();
