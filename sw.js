const CACHE_NAME = 'kanji-tsv-reader-v15';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './data-index.json',
  './data/current_file.txt',
  './data/N5_v1.0.tsv',
  './data/N4_v1.0.tsv',
  './data/N3_v1.0.tsv',
  './icons/icon-192.svg',
  './vendor/fireworks.umd.js',
];

function isSameOrigin(requestUrl) {
  return requestUrl.origin === self.location.origin;
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key))));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const wantsDocument = request.mode === 'navigate' || (request.destination === 'document');

  if (wantsDocument) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html', networkResponse.clone());
        return networkResponse;
      } catch {
        return (await caches.match('./index.html')) || caches.match('./');
      }
    })());
    return;
  }

  if (isSameOrigin(url)) {
    event.respondWith((async () => {
      try {
        return await cacheFirst(request);
      } catch {
        const fallback = await caches.match(request);
        if (fallback) return fallback;
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })());
  }
});
