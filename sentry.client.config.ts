// Sentry init for the browser bundle. The DSN is public (it identifies the
// project, not a secret); per-event ingestion is gated by Sentry's own rate
// limits + spike protection. Tracing is sampled at 10% — enough to spot
// regressions without burning the free quota.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,
  // Replay can record DOM snapshots of error sessions. Keep it off until we
  // need to pay for the storage — for now traces + breadcrumbs are enough.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Ignore the noisy stuff that shows up in the wild but isn't actionable:
  // browser extensions, AdBlock, network blips during prefetch, etc.
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
  ],
});
