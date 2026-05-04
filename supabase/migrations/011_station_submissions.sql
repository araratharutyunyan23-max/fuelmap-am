-- ============================================================================
-- FuelMap Armenia — Phase 11: crowdsourced station submissions
--
-- Lets a user propose a new gas station; admin approves; we auto-create
-- the public.stations row from the proposal. Mirrors the price_reports
-- moderation flow (Telegram-on-insert, email-on-status-change), plus an
-- "auto-create station on confirm" trigger so admins don't have to copy
-- fields by hand.
-- ============================================================================

create table if not exists public.station_submissions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete set null,
  brand              text not null,
  name               text,
  lat                double precision not null,
  lng                double precision not null,
  address            text,
  photo_url          text,
  status             text not null default 'pending'
                     check (status in ('pending', 'confirmed', 'rejected')),
  -- Set by trg_create_station_on_confirm when admin approves.
  created_station_id text references public.stations(id) on delete set null,
  rejection_reason   text,
  created_at         timestamptz not null default now(),
  reviewed_at        timestamptz,
  reviewed_by        uuid references auth.users(id) on delete set null
);

create index if not exists station_submissions_status_idx
  on public.station_submissions (status, created_at desc);
create index if not exists station_submissions_user_idx
  on public.station_submissions (user_id);

alter table public.station_submissions enable row level security;

-- Users can insert their own proposals.
drop policy if exists "users insert own submission" on public.station_submissions;
create policy "users insert own submission"
  on public.station_submissions for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can read their own submissions (any status).
drop policy if exists "users read own submissions" on public.station_submissions;
create policy "users read own submissions"
  on public.station_submissions for select
  to authenticated
  using (user_id = auth.uid());

-- Admins can read any submission.
drop policy if exists "admins read all submissions" on public.station_submissions;
create policy "admins read all submissions"
  on public.station_submissions for select
  to authenticated
  using (public.is_admin());

-- Admins can update status / fields.
drop policy if exists "admins update submissions" on public.station_submissions;
create policy "admins update submissions"
  on public.station_submissions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Telegram alert on new submission, with an admin deep-link.
-- Mirrors notify_telegram_on_price_report().
-- ----------------------------------------------------------------------------
create or replace function public.notify_telegram_on_station_submission()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  bot_token  text;
  chat_id    text;
  app_url    text;
  user_email text;
  message    text;
begin
  select value into bot_token from private.app_settings where key = 'telegram_bot_token';
  select value into chat_id   from private.app_settings where key = 'telegram_chat_id';
  select value into app_url   from private.app_settings where key = 'app_url';
  if bot_token is null or chat_id is null then return new; end if;

  select u.email into user_email from auth.users u where u.id = new.user_id;

  message := format(
    E'🆕 Новая заявка на АЗС\n\nБренд: %s%s\nКоординаты: %s, %s%s\nОт: %s%s%s',
    new.brand,
    case when new.name is not null then E'\nНазвание: ' || new.name else '' end,
    new.lat::text, new.lng::text,
    case when new.address is not null then E'\nАдрес: ' || new.address else '' end,
    coalesce(user_email, '?'),
    case when new.photo_url is not null then E'\n📷 ' || new.photo_url else '' end,
    case when app_url is not null
         then E'\n\n👉 Открыть в админке: ' || app_url || '/?admin=stations'
         else '' end
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

drop trigger if exists trg_notify_telegram_on_station_submission on public.station_submissions;
create trigger trg_notify_telegram_on_station_submission
  after insert on public.station_submissions
  for each row execute function public.notify_telegram_on_station_submission();

-- ----------------------------------------------------------------------------
-- On admin confirm, auto-create the public.stations row.
-- Brand color is copied from any existing station of the same brand
-- (we keep brand_color denormalised) and falls back to neutral grey.
-- ----------------------------------------------------------------------------
create or replace function public.create_station_on_submission_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id    text;
  resolved_color text;
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    -- Skip if we already created the station for this submission (idempotent).
    if new.created_station_id is not null then return new; end if;

    new_id := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);

    select brand_color into resolved_color
      from public.stations where brand = new.brand limit 1;
    if resolved_color is null then resolved_color := '#64748b'; end if;

    insert into public.stations
      (id, name, brand, brand_color, address, address_hy, lat, lng, rating, reviews_count)
    values
      (new_id,
       coalesce(new.name, new.brand),
       new.brand,
       resolved_color,
       new.address,
       null,
       new.lat,
       new.lng,
       0,
       0)
    on conflict (id) do nothing;

    new.created_station_id := new_id;
    new.reviewed_at := now();
    return new;
  end if;

  if new.status = 'rejected' and old.status is distinct from 'rejected' then
    new.reviewed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_create_station_on_submission_confirm on public.station_submissions;
create trigger trg_create_station_on_submission_confirm
  before update on public.station_submissions
  for each row execute function public.create_station_on_submission_confirm();

-- ----------------------------------------------------------------------------
-- Email the submitter when the admin moves their proposal out of pending.
-- Mirrors notify_user_on_price_report_status from migration 010.
-- ----------------------------------------------------------------------------
create or replace function public.notify_user_on_station_submission_status()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  api_key    text;
  user_email text;
  subject    text;
  body       text;
begin
  if old.status = new.status then return new; end if;
  if new.status not in ('confirmed', 'rejected') then return new; end if;

  select value into api_key from private.app_settings where key = 'resend_api_key';
  if api_key is null or api_key = '' then return new; end if;

  select u.email into user_email from auth.users u where u.id = new.user_id;
  if user_email is null then return new; end if;

  if new.status = 'confirmed' then
    subject := 'АЗС добавлена · FuelMap Armenia';
    body := format(
      E'Спасибо! АЗС «%s» (%s) добавлена на карту FuelMap Armenia.\n\nFuelMap Armenia\nhttps://fuelmap.app',
      coalesce(new.name, new.brand), new.brand
    );
  else
    subject := 'Заявка на АЗС не подтверждена · FuelMap Armenia';
    body := format(
      E'Заявка на «%s» (%s) не подтверждена.%s\n\nFuelMap Armenia\nhttps://fuelmap.app',
      coalesce(new.name, new.brand), new.brand,
      case when new.rejection_reason is not null and new.rejection_reason <> ''
           then E'\n\nПричина: ' || new.rejection_reason
           else '' end
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

drop trigger if exists trg_notify_user_on_station_submission_status on public.station_submissions;
create trigger trg_notify_user_on_station_submission_status
  after update of status on public.station_submissions
  for each row execute function public.notify_user_on_station_submission_status();
