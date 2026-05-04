'use client';

import { useEffect } from 'react';
import { isAppInstalled } from '@/lib/install-link';
import { useAuth } from '@/lib/auth-store';
import { useLocale } from '@/lib/locale-store';
import { track } from '@/lib/analytics';

const REPORTED_KEY = 'install_reported_v1';

// Fire-and-forget: notify our backend that the PWA was installed. We
// hit two triggers because they cover non-overlapping platforms:
//
//   * `appinstalled` event — Android / desktop Chrome dispatch this
//     the moment install completes, even before the user opens the
//     installed shell.
//   * Standalone open — iOS Safari has no equivalent event, so we
//     wait for the first time the page renders inside the standalone
//     home-screen shell and report then.
//
// localStorage is per-origin and survives both modes (Safari tab and
// home-screen PWA), so we won't double-fire after a user installs
// from the same device.
export function InstallTracker() {
  const { user } = useAuth();
  const { locale } = useLocale();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(REPORTED_KEY)) return;

    const report = (trigger: 'appinstalled' | 'standalone-open') => {
      if (window.localStorage.getItem(REPORTED_KEY)) return;
      window.localStorage.setItem(REPORTED_KEY, trigger);
      track('pwa_installed', { trigger, locale });
      fetch('/api/track-install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger,
          locale,
          user_email: user?.email ?? null,
        }),
      }).catch(() => {
        // Best-effort: if the network is bad we drop the ping. Don't
        // unset the flag — re-firing on every refresh would be noisy.
      });
    };

    if (isAppInstalled()) {
      report('standalone-open');
      return;
    }

    const onInstall = () => report('appinstalled');
    window.addEventListener('appinstalled', onInstall);
    return () => window.removeEventListener('appinstalled', onInstall);
  }, [user?.email, locale]);

  return null;
}
