// Sentry init for the Edge runtime (middleware, anything Vercel routes
// through their edge layer). Mostly empty for us right now — kept here so
// errors from edge functions don't fall through to console only.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
    && process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,
});
