import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow accessing dev-mode HMR + RSC resources from public tunnels
  // (Cloudflare quick tunnels, ngrok) when testing on a real phone.
  allowedDevOrigins: ['*.trycloudflare.com', '*.ngrok-free.app', '*.ngrok.io'],
}

// Sentry wrapper. Source map upload + tunnel route are auto-configured;
// we only talk to Sentry during the build when SENTRY_AUTH_TOKEN is set.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // EU region — sentry-cli defaults to sentry.io; with a German org we
  // need to point it at de.sentry.io so source map upload hits the
  // right ingest endpoint.
  sentryUrl: process.env.SENTRY_URL,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Don't talk to Sentry during the build if no auth token is set
  // (local builds without secrets, preview builds, etc.).
  silent: !process.env.SENTRY_AUTH_TOKEN,

  // Avoid ad-blocker problems by routing /monitoring/* through our domain
  // back to Sentry. Avoids false-positive blocks of `*.ingest.sentry.io`.
  tunnelRoute: '/monitoring',

  hideSourceMaps: true,
  disableLogger: true,
});
