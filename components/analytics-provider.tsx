'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-store';
import { identifyUser, initAnalytics, resetUser } from '@/lib/analytics';

// Boots PostHog once, then keeps the identified user in sync with the
// auth state — identify() on login, reset() on logout. Anonymous users
// keep their generated distinct_id so the funnel from "first open" to
// "registered" stays connected.

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user) {
      identifyUser(user.id, {
        email: user.email,
        name: (user.user_metadata?.name as string | undefined) ?? null,
      });
    } else {
      resetUser();
    }
  }, [loading, user]);

  return <>{children}</>;
}
