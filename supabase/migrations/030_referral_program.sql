-- ============================================================================
-- FuelMap Armenia — Phase 30: referral program
--
-- Each user gets a 6-character referral code. Sharing a link of the form
-- fuelmap.app/?r=K7M9X2 brings new visitors who, on signup, are
-- attached to the original user as their referrer. The referrer earns
-- a bonus the first time the referred user installs the PWA — install
-- is the lowest-friction "real activity" signal we have. Welcome bonus
-- for the new user lands at the same moment.
--
-- Reward amounts:
--   * Referrer  +100 ֏  (first install of a referred user)
--   * Referred  +50 ֏   (first install — welcome bonus, on top of the
--                        existing +50 ֏ for confirmed price reports)
--
-- Anti-abuse: a single user_balance row can fire the install-credit
-- trigger only once. installed_at is set on the very first install and
-- never overwritten. Reinstall does not re-credit. Self-referral
-- detection (matching IPs / device fingerprints) is deferred until we
-- see actual abuse — keeping the MVP small.
-- ============================================================================

-- 1. New columns on user_balance ----------------------------------------------
alter table public.user_balance
  add column if not exists referral_code text unique,
  add column if not exists referrer_id   uuid references auth.users(id) on delete set null,
  add column if not exists installed_at  timestamptz;

create index if not exists user_balance_referrer_idx on public.user_balance (referrer_id);

-- 2. referral_events ----------------------------------------------------------
-- One row per referred user — captures who-referred-whom and the eventual
-- payout state. status flips from 'pending' (set on signup) to 'rewarded'
-- when the install fires the bonus, or to 'blocked_*' if anti-abuse trips.
create table if not exists public.referral_events (
  id           uuid primary key default gen_random_uuid(),
  referrer_id  uuid not null references auth.users(id) on delete cascade,
  referred_id  uuid not null references auth.users(id) on delete cascade,
  status       text not null check (status in ('pending', 'rewarded', 'blocked_self', 'blocked_abuse')),
  reward_amd   integer,
  triggered_at timestamptz,
  created_at   timestamptz not null default now(),
  unique(referred_id) -- one user is referred by at most one person, ever
);

create index if not exists referral_events_referrer_idx on public.referral_events (referrer_id, status);

alter table public.referral_events enable row level security;

drop policy if exists "users read own referral events as referrer" on public.referral_events;
create policy "users read own referral events as referrer"
  on public.referral_events for select
  to authenticated
  using (referrer_id = auth.uid());

-- 3. Code generator -----------------------------------------------------------
-- Crockford-base32 alphabet (avoids confusing chars like 0/O, 1/I/L).
-- Six characters → ~ 1B unique codes; collision retry built in.
create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
  candidate text;
  i int;
begin
  for attempt in 1..10 loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    if not exists (select 1 from public.user_balance where referral_code = candidate) then
      return candidate;
    end if;
  end loop;
  raise exception 'failed to allocate unique referral code after 10 attempts';
end;
$$;

-- 4. Auto-create user_balance + referral_code on signup -----------------------
-- The existing flows expect a user_balance row to appear after first
-- credit; from now on we want one to exist as soon as the auth user
-- does, so the referral code is ready for the profile screen on day 1.
create or replace function public.create_balance_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_balance (user_id, referral_code)
  values (new.id, public.generate_referral_code())
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_create_balance_on_signup on auth.users;
create trigger trg_create_balance_on_signup
  after insert on auth.users
  for each row execute function public.create_balance_on_signup();

-- Backfill: every existing user without a code gets one now.
update public.user_balance
   set referral_code = public.generate_referral_code()
 where referral_code is null;

-- And every existing auth user without a balance row gets one.
insert into public.user_balance (user_id, referral_code)
select u.id, public.generate_referral_code()
  from auth.users u
  left join public.user_balance b on b.user_id = u.id
 where b.user_id is null;

-- 5. RPC: apply a referral code at signup time --------------------------------
-- Frontend calls this right after auth.signUp() with whatever code the
-- onboarding screen captured from ?r= and stashed in localStorage.
-- The function is idempotent — once referrer_id is set, it can't be
-- changed (prevents stealing referrals later).
create or replace function public.apply_referral_code(code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ref_id uuid;
  caller uuid := auth.uid();
begin
  if caller is null then
    return false;
  end if;
  if code is null or length(trim(code)) = 0 then
    return false;
  end if;

  select user_id into ref_id
    from public.user_balance
   where referral_code = upper(trim(code))
   limit 1;

  if ref_id is null or ref_id = caller then
    return false;
  end if;

  -- Only set referrer once.
  update public.user_balance
     set referrer_id = ref_id
   where user_id = caller
     and referrer_id is null;

  if found then
    insert into public.referral_events (referrer_id, referred_id, status)
    values (ref_id, caller, 'pending')
    on conflict (referred_id) do nothing;
    return true;
  end if;
  return false;
end;
$$;

grant execute on function public.apply_referral_code(text) to authenticated;

-- 6. Install-bonus trigger ----------------------------------------------------
-- Fires when user_balance.installed_at flips NULL → not NULL. Credits:
--   * the user themselves: +50 ֏ welcome
--   * their referrer (if any): +100 ֏
-- Both go through the existing earned_this_month_amd cap.
create or replace function public.credit_install_and_referral()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  WELCOME_AMD constant int := 50;
  REFERRAL_AMD constant int := 100;
  cur_month  date := date_trunc('month', now())::date;
begin
  -- Trigger only on the NULL → not NULL transition.
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

  -- 2. Referral bonus to the referrer (if there is one).
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
  end if;

  return new;
end;
$$;

drop trigger if exists trg_credit_install_and_referral on public.user_balance;
create trigger trg_credit_install_and_referral
  after update of installed_at on public.user_balance
  for each row execute function public.credit_install_and_referral();
