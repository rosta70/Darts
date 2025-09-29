/*
  Service Worker pro Šipky – zapis skóre
  - jednoduché cache-first pro statická aktiva
  - fallback na síť a offline odpověď pro root
*/

const CACHE = 'darts-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest'
  // Přidej i ikony, až je do repa nahraješ:
  // './icons/icon-192.png',
  // './icons/icon-512.png',
  // './icons/maskable-192.png',
  // './icons/maskable-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // jen GET

  event.respondWith((async () => {
    const url = new URL(req.url);

    // Cache-first pro vlastní statiky
    if (url.origin === location.origin) {
      const cached = await caches.match(req);
      if (cached) return cached;
    }

    try {
      const fresh = await fetch(req);
      // Ulož jen úspěšné odpovědi
      if (fresh && fresh.status === 200 && fresh.type === 'basic') {
        const cache = await caches.open(CACHE);
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
