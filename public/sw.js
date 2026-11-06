// Boya PWA service worker — installable customer + salon panels.
// Strategy: network-first for navigations and API passthrough (booking data
// must never go stale), cache-first for static assets (hashed bundles, icons,
// images) so the app shell still loads offline.
const CACHE_VERSION = 'boya-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(['/', '/manifest.json', '/assets/boya-logo.png']);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)),
    );
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  // API calls always hit the network — a cached booking or OTP is worse than none.
  if (request.url.includes('/api/')) return;

  // Static assets: cache-first, fill the cache from the network on miss.
  if (['image', 'script', 'style', 'font'].includes(request.destination)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const res = await fetch(request);
        if (res && res.ok) {
          const copy = res.clone();
          const cache = await caches.open(ASSET_CACHE);
          cache.put(request, copy);
        }
        return res;
      } catch {
        return cached || Response.error();
      }
    })());
    return;
  }

  // Navigations: network-first (fresh HTML), fall back to the cached shell
  // so a offline reload still opens the app instead of the browser error page.
  event.respondWith((async () => {
    try {
      const res = await fetch(request);
      if (res && res.ok) {
        const copy = res.clone();
        const cache = await caches.open(SHELL_CACHE);
        cache.put(request, copy);
      }
      return res;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      return (await caches.match('/')) || Response.error();
    }
  })());
});
