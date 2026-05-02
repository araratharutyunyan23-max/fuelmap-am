// FuelMap PWA service worker — keep it small and conservative.
//
// We only pre-cache the app shell + icons + manifest. Live data
// (Supabase REST, Leaflet tiles) is intentionally NOT cached — gas
// prices and station coordinates must always come fresh.
//
// Bump CACHE_VERSION whenever the shell or icons change to invalidate
// old caches on the next page load.

const CACHE_VERSION = 'fuelmap-shell-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for everything; fall back to cache on failure.
// This keeps prices fresh online and lets the app at least open
// the splash + last-known shell when offline.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Skip non-GET and cross-origin requests entirely.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache Supabase, the OCR API, or analytics.
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Cache successful HTML / static asset responses.
        if (res.ok && (res.type === 'basic' || res.type === 'default')) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached ?? caches.match('/')))
  );
});
