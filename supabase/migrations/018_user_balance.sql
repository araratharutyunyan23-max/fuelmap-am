-- ============================================================================
-- FuelMap Armenia — Phase 18: reward balance for confirmed price reports
--
--  +20 ֏ to user_balance.amount_amd on every flip price_reports.status →
--  'confirmed'. Hard cap 2,000 ֏ per calendar month per user (rolling
--  anchored to month start). Manual payouts via the FuelMap Telegram
--  contact when balance >= 500 ֏.
--
--  Additive — does NOT change any existing trigger / column / RLS policy.
--  IP capture column on price_reports is reserved for a follow-up PR
--  (Vercel middleware needed to log honest client IPs); kept here so the
--  one migration covers the data shape we'll grow into.
-- ============================================================================

-- Per-user balance ledger.
create table if not exists public.user_balance (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  amount_amd           integer not null default 0 check (amount_amd >= 0),
  total_earned_amd     integer not null default 0 check (total_earned_amd >= 0),
  -- Counter that resets each calendar month. Trigger zeros it out when
  -- crossing month_anchor, so we don't have to scan history every time.
  earned_this_month_amd integer not null default 0 check (earned_this_month_amd >= 0),
  month_anchor         date not null default date_trunc('month', now())::date,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.user_balance enable row level security;

drop policy if exists "users read own balance" on public.user_balance;
create policy "users read own balance"
  on public.user_balance for select
  to authenticated
  using (user_id = auth.uid());

-- Admins can read all balances (so admin UI can show "this user has X" when
-- moderating).
drop policy if exists "admins read all balances" on public.user_balance;
create policy "admins read all balances"
  on public.user_balance for select
  to authenticated
  using (public.is_admin());

-- Admins can update balances (so manual payouts can zero out the balance).
drop policy if exists "admins update balances" on public.user_balance;
create policy "admins update balances"
  on public.user_balance for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- IP address captured on price_reports for fraud-pattern review.
alter table public.price_reports add column if not exists ip_address text;

-- ----------------------------------------------------------------------------
-- Credit the user when admin confirms a price_report.
-- New trigger; coexists with the existing notify-via-email and push triggers.
-- ----------------------------------------------------------------------------
create or replace function public.credit_balance_on_price_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  REWARD_AMD     constant int := 20;
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

  -- First-ever credit for this user.
  if cur_balance is null then
    insert into public.user_balance
      (user_id, amount_amd, total_earned_amd, earned_this_month_amd, month_anchor)
    values
      (new.user_id, REWARD_AMD, REWARD_AMD, REWARD_AMD, current_month);
    return new;
  end if;

  -- Roll the month counter if we crossed a calendar boundary since the
  -- last credit.
  if cur_anchor < current_month then
    cur_month_amt := 0;
    cur_anchor := current_month;
  end if;

  -- Hit the monthly cap → record nothing, just keep the anchor fresh.
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

drop trigger if exists trg_credit_balance_on_price_confirm on public.price_reports;
create trigger trg_credit_balance_on_price_confirm
  after update of status on public.price_reports
  for each row execute function public.credit_balance_on_price_confirm();
