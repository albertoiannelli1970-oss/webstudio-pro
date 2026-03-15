const CACHE_NAME = 'prima-nota-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './core.js',
  './primanota.js',
  './logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
