'use client';

import posthog from 'posthog-js';

// Tiny wrapper around posthog-js. Components import from here instead
// of touching posthog directly so the rest of the codebase stays
// vendor-agnostic — if we ever swap to Mixpanel / Plausible / nothing,
// only this file changes.

let initialized = false;

export function initAnalytics() {
  if (typeof window === 'undefined') return;
  if (initialized) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return; // analytics off in local dev unless the env is set
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    capture_pageview: 'history_change', // SPA-aware autocapture
    autocapture: true,
    persistence: 'localStorage+cookie',
    // Keep session recordings off until we need them — they're heavy
    // bandwidth-wise and we hit the free-tier ceiling fast otherwise.
    disable_session_recording: true,
  });
  initialized = true;
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !initialized) return;
  posthog.identify(userId, traits);
}

export function resetUser() {
  if (typeof window === 'undefined' || !initialized) return;
  posthog.reset();
}

export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined' || !initialized) return;
  posthog.capture(event, props);
}
