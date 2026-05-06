-- ============================================================================
-- FuelMap Armenia — Phase 27: raise price-report reward 20 ֏ → 50 ֏
--
-- Original reward (migration 018) was 20 ֏ per confirmed price photo.
-- The crowdsourced submission rate is lower than expected, so we're
-- bumping it 2.5x. The monthly cap (2,000 ֏) and trigger structure
-- stay the same — only the REWARD_AMD constant changes.
--
-- Already-issued credits are NOT retroactive: existing user_balance
-- rows keep whatever amount they had. New confirmations from now on
-- credit 50 ֏.
-- ============================================================================

create or replace function public.credit_balance_on_price_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  REWARD_AMD     constant int := 50;
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
