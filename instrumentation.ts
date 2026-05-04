// Next.js calls register() once per server instance. We dispatch into the
// matching sentry config based on the runtime — Node for serverless functions,
// Edge for the edge runtime. The browser config is loaded automatically by
// withSentryConfig in next.config.mjs.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export { captureRequestError as onRequestError } from '@sentry/nextjs';
