-- ============================================================================
-- FuelMap Armenia — Phase 25: reward +100 ֏ for confirmed station submissions
--
-- Mirror of credit_balance_on_price_confirm (migration 018), but for
-- station_submissions and at +100 ֏ — adding a missing AZS is rarer and
-- more valuable than a price photo, so the reward is 5x larger.
--
-- Shares the existing 2,000 ֏/month cap on user_balance.earned_this_month_amd
-- with price_reports. With station credit at 100 ֏, that's 20 confirmed
-- station submissions per user per month before they hit the wall — no
-- realistic contributor will brush against it.
--
-- Also recreates notify_user_on_station_submission_status (originally from
-- migration 011) so the confirmed-AZS email mentions the reward.
-- ============================================================================

create or replace function public.credit_balance_on_station_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  REWARD_AMD     constant int := 100;
  MONTHLY_CAP    constant int := 2000;
  current_month  date;
  cur_balance    int;
  cur_total      int;
  cur_month_amt  int;
  cur_anchor     date;
begin
  if old.status = new.status or new.status <> 'confirmed' then
    return new;
  end if;
  if new.user_id is null then return new; end if;

  current_month := date_trunc('month', now())::date;

  select amount_amd, total_earned_amd, earned_this_month_amd, month_anchor
    into cur_balance, cur_total, cur_month_amt, cur_anchor
  from public.user_balance where user_id = new.user_id;

  if cur_balance is null then
    insert into public.user_balance
      (user_id, amount_amd, total_earned_amd, earned_this_month_amd, month_anchor)
    values
      (new.user_id, REWARD_AMD, REWARD_AMD, REWARD_AMD, current_month);
    return new;
  end if;

  if cur_anchor < current_month then
    cur_month_amt := 0;
    cur_anchor := current_month;
  end if;

  if cur_month_amt + REWARD_AMD > MONTHLY_CAP then
    update public.user_balance
       set month_anchor = cur_anchor,
           updated_at   = now()
     where user_id = new.user_id;
    return new;
  end if;

  update public.user_balance
     set amount_amd            = cur_balance + REWARD_AMD,
         total_earned_amd      = cur_total + REWARD_AMD,
         earned_this_month_amd = cur_month_amt + REWARD_AMD,
         month_anchor          = cur_anchor,
         updated_at            = now()
   where user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_credit_balance_on_station_confirm on public.station_submissions;
create trigger trg_credit_balance_on_station_confirm
  after update of status on public.station_submissions
  for each row execute function public.credit_balance_on_station_confirm();

-- ----------------------------------------------------------------------------
-- Recreate the email so the confirmed branch mentions +100 ֏.
-- Subject + body are the only thing changing; rejection branch is unchanged.
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
    subject := 'АЗС добавлена · +100 ֏ на ваш баланс';
    body := format(
      E'Спасибо! АЗС «%s» (%s) добавлена на карту FuelMap Armenia.\n\nЗа ваш вклад мы зачислили 100 ֏ на ваш баланс — посмотреть его можно в профиле приложения.\n\nFuelMap Armenia\nhttps://fuelmap.app',
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
