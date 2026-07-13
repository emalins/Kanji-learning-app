const CACHE_NAME = 'kanji-tsv-reader-v13';
const ASSETS = [
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
  './icons/icon-192.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.map((key) => (key === CACHE_NAME ? null : caches.delete(key)))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
