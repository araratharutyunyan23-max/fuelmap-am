'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth-store';

export interface UserBalance {
  amount: number;
  totalEarned: number;
  earnedThisMonth: number;
  monthAnchor: string | null;
}

const ZERO: UserBalance = {
  amount: 0,
  totalEarned: 0,
  earnedThisMonth: 0,
  monthAnchor: null,
};

// Reads public.user_balance for the current user. The row may not exist
// until the first confirmed price_report — treat that as "zero balance".
// RLS only allows the user to see their own row.
export function useBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<UserBalance>(ZERO);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setBalance(ZERO);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('user_balance')
      .select('amount_amd, total_earned_amd, earned_this_month_amd, month_anchor')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setBalance({
            amount: data.amount_amd,
            totalEarned: data.total_earned_amd,
            earnedThisMonth: data.earned_this_month_amd,
            monthAnchor: data.month_anchor,
          });
        } else {
          setBalance(ZERO);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { balance, loading };
}
