-- ============================================================================
-- FuelMap Armenia — Phase 31: referral push notifications + name lookup
--
-- Two follow-ons to migration 030 (referral program MVP):
--   1. When the install trigger fires the +100/+50 ֏ payout, also push
--      a localized notification to BOTH parties ("you earned 100 ֏" /
--      "welcome 50 ֏"). Uses the existing send_push_notification helper
--      and user_locale() for ru/hy.
--   2. New RPC lookup_referrer_name(code) so the onboarding screen can
--      show "🎁 Քեզ հրավիրեց Արամ" before the user signs up. Safe to
--      call anonymously — returns only display_name (or null), nothing
--      else from auth.users.
-- ============================================================================

-- 1. Update the install-credit trigger to also send pushes ---------------------
create or replace function public.credit_install_and_referral()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  WELCOME_AMD constant int := 50;
  REFERRAL_AMD constant int := 100;
  cur_month  date := date_trunc('month', now())::date;
  ref_loc    text;
  user_loc   text;
  ref_title  text;
  ref_body   text;
  user_title text;
  user_body  text;
  ref_user_name text;
begin
  if old.installed_at is not null then return new; end if;
  if new.installed_at is null then return new; end if;

  -- 1. Welcome bonus to the user.
  update public.user_balance
     set amount_amd            = amount_amd + WELCOME_AMD,
         total_earned_amd      = total_earned_amd + WELCOME_AMD,
         earned_this_month_amd = earned_this_month_amd + WELCOME_AMD,
         month_anchor          = cur_month,
         updated_at            = now()
   where user_id = new.user_id;

  -- Push to the new user about the welcome bonus.
  user_loc := public.user_locale(new.user_id);
  if user_loc = 'hy' then
    user_title := 'Բարի գալուստ FuelMap-ին! 🎁';
    user_body  := format('Տեղադրման համար ստացար +%s ֏ welcome-բոնուս', WELCOME_AMD);
  else
    user_title := 'Добро пожаловать в FuelMap! 🎁';
    user_body  := format('За установку приложения ты получил +%s ֏ welcome-бонус', WELCOME_AMD);
  end if;
  perform public.send_push_notification(new.user_id, user_title, user_body, '/');

  -- 2. Referral bonus to the referrer (if any).
  if new.referrer_id is not null then
    update public.user_balance
       set amount_amd            = amount_amd + REFERRAL_AMD,
           total_earned_amd      = total_earned_amd + REFERRAL_AMD,
           earned_this_month_amd = earned_this_month_amd + REFERRAL_AMD,
           updated_at            = now()
     where user_id = new.referrer_id;

    update public.referral_events
       set status       = 'rewarded',
           reward_amd   = REFERRAL_AMD,
           triggered_at = now()
     where referred_id = new.user_id
       and status      = 'pending';

    -- Look up the new user's display name for the referrer's push.
    select coalesce(
             raw_user_meta_data->>'name',
             split_part(email, '@', 1)
           )
      into ref_user_name
      from auth.users
     where id = new.user_id;
    if ref_user_name is null or ref_user_name = '' then
      ref_user_name := 'друг';
    end if;

    -- Push to the referrer.
    ref_loc := public.user_locale(new.referrer_id);
    if ref_loc = 'hy' then
      ref_title := 'Քո հրավերը ստացվեց! 🎁';
      ref_body  := format('%s տեղադրեց հավելվածը քո հղումով — դու ստացար +%s ֏',
                          ref_user_name, REFERRAL_AMD);
    else
      ref_title := 'Твой реферал зарегистрировался! 🎁';
      ref_body  := format('%s установил приложение по твоей ссылке — ты получил +%s ֏',
                          ref_user_name, REFERRAL_AMD);
    end if;
    perform public.send_push_notification(new.referrer_id, ref_title, ref_body, '/');
  end if;

  return new;
end;
$$;

-- 2. Anonymous-safe lookup: code → referrer's display name --------------------
-- Returns the referrer's display name only (no email, no id). Safe to
-- expose to unauthenticated visitors so the onboarding banner can show
-- "Тебя пригласил Арам" before they sign up.
create or replace function public.lookup_referrer_name(code text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
           u.raw_user_meta_data->>'name',
           split_part(u.email, '@', 1)
         )
    from public.user_balance b
    join auth.users u on u.id = b.user_id
   where b.referral_code = upper(trim(code))
   limit 1;
$$;

grant execute on function public.lookup_referrer_name(text) to anon, authenticated;
