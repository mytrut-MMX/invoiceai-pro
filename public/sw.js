/* ─── InvoiceSaga Service Worker ─────────────────────────────────────────────
   Strategy:
   - App shell (HTML navigation) → Network-first, fallback to cache
   - Static assets (JS/CSS/SVG/fonts) → Cache-first, update in background
   - Supabase API → Network-only (never cache auth/data)
   ─────────────────────────────────────────────────────────────────────────── */

const CACHE = 'invoicesaga-v1';
const OFFLINE_URL = '/';

const PRECACHE = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
];

// ── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Never intercept Supabase or external API calls
  if (!url.origin.includes(self.location.hostname)) return;

  // HTML navigation → network-first, fallback to cached shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets → cache-first, update in background (stale-while-revalidate)
  if (
    url.pathname.startsWith('/assets/') ||
    /\.(js|css|svg|png|jpg|webp|woff2?|ico)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          });
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ── PUSH NOTIFICATION (future-ready) ─────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'InvoiceSaga', {
    body: data.body || '',
    icon: '/icon-192.svg',
    badge: '/favicon.svg',
    data: { url: data.url || '/' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((list) => {
      const existing = list.find((c) => c.url === target && 'focus' in c);
      return existing ? existing.focus() : clients.openWindow(target);
    })
  );
});
