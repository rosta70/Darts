/*
  Service Worker pro Šipky – zapis skóre
  - cache-first pro statická aktiva, síť s doplněním do cache pro ostatní
  - okamžitá aktivace nové verze (SKIP_WAITING)
*/

const CACHE_VERSION = 'darts-cache-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  // Ikony (pokud jsou v /icons/):
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_VERSION ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    const url = new URL(req.url);

    // Naše statická aktiva – cache-first
    if (url.origin === location.origin) {
      const inCache = await caches.match(req);
      if (inCache) return inCache;
    }

    try {
      const fresh = await fetch(req);
      if (fresh && fresh.status === 200 && fresh.type === 'basic') {
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      // Offline fallback pro navigaci
      if (req.mode === 'navigate') {
        return caches.match('./index.html');
      }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
