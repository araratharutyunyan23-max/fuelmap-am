// FuelMap PWA service worker — keep it small and conservative.
//
// We only pre-cache the app shell + icons + manifest. Live data
// (Supabase REST, Leaflet tiles) is intentionally NOT cached — gas
// prices and station coordinates must always come fresh.
//
// Bump CACHE_VERSION whenever the shell or icons change to invalidate
// old caches on the next page load.

const CACHE_VERSION = 'fuelmap-shell-v2';
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

// ---------------------------------------------------------------------------
// Push events — fired when our /api/push/send route delivers a notification
// for this device. Payload is JSON: { title, body, url? }.
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = { title: 'FuelMap Armenia', body: '', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // If the payload isn't JSON, fall back to plain text in the body.
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      // Focus an open tab if there is one; otherwise open a new one.
      for (const w of wins) {
        try {
          const wUrl = new URL(w.url);
          if (wUrl.origin === self.location.origin) {
            return w.focus().then(() => (w.navigate ? w.navigate(target) : null));
          }
        } catch {
          /* noop */
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
