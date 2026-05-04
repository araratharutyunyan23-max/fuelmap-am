// Sentry init for Node runtime (Vercel server functions, our /api routes).

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
    && process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,
});
